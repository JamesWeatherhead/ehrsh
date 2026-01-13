/**
 * SMS/Messaging integration for patient communication
 * Supports multiple providers: Twilio (primary) and Mock mode for demos
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { EHRClient, FHIRPatient } from './fhir/client.js';
import { getConfig } from './config.js';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Also check for ~/.ehrshrc
const homeEnvPath = path.join(process.env.HOME || '', '.ehrshrc');
if (fs.existsSync(homeEnvPath)) {
  dotenv.config({ path: homeEnvPath });
}

// ============================================
// Types and Interfaces
// ============================================

export type MessagingMode = 'twilio' | 'mock';

export interface MessagingConfig {
  mode: MessagingMode;
  twilio?: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  conversationId: string;
  error?: string;
  timestamp: Date;
  provider: MessagingMode;
}

export interface PatientResponse {
  conversationId: string;
  patientId: string;
  message: string;
  receivedAt: Date;
  fromNumber: string;
}

export interface SendMessageOptions {
  patientId: string;
  message: string;
  /** Optional FHIR client to use for looking up patient phone */
  client?: EHRClient;
}

// ============================================
// Messaging Configuration
// ============================================

let messagingConfig: MessagingConfig | null = null;

/**
 * Load messaging configuration from environment variables
 */
export function loadMessagingConfig(): MessagingConfig {
  const mode = (process.env.MESSAGING_MODE || 'mock') as MessagingMode;

  const config: MessagingConfig = { mode };

  if (mode === 'twilio') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      console.warn(
        'Twilio mode selected but credentials missing. Falling back to mock mode.'
      );
      config.mode = 'mock';
    } else {
      config.twilio = { accountSid, authToken, phoneNumber };
    }
  }

  return config;
}

/**
 * Get the current messaging configuration
 */
export function getMessagingConfig(): MessagingConfig {
  if (!messagingConfig) {
    messagingConfig = loadMessagingConfig();
  }
  return messagingConfig;
}

/**
 * Set messaging mode at runtime
 */
export function setMessagingMode(mode: MessagingMode): void {
  messagingConfig = loadMessagingConfig();
  messagingConfig.mode = mode;
}

// ============================================
// Mock Provider - In-memory simulation
// ============================================

interface MockConversation {
  id: string;
  patientId: string;
  phoneNumber: string;
  messages: Array<{
    direction: 'outbound' | 'inbound';
    content: string;
    timestamp: Date;
  }>;
  pendingResponse?: PatientResponse;
}

const mockConversations: Map<string, MockConversation> = new Map();

/**
 * Generate a unique conversation ID
 */
function generateConversationId(): string {
  return 'conv-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
}

/**
 * Generate a mock message ID
 */
function generateMessageId(): string {
  return 'msg-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
}

/**
 * Mock SMS provider - logs to console and simulates responses
 */
class MockMessagingProvider {
  async sendMessage(
    phoneNumber: string,
    message: string,
    patientId: string
  ): Promise<MessageResult> {
    const conversationId = generateConversationId();
    const messageId = generateMessageId();

    // Store the conversation
    const conversation: MockConversation = {
      id: conversationId,
      patientId,
      phoneNumber,
      messages: [
        {
          direction: 'outbound',
          content: message,
          timestamp: new Date(),
        },
      ],
    };
    mockConversations.set(conversationId, conversation);

    // Log to console for demo
    console.log('\n' + '='.repeat(50));
    console.log('[MOCK SMS] Sending to: ' + phoneNumber);
    console.log('[MOCK SMS] Patient ID: ' + patientId);
    console.log('[MOCK SMS] Message: ' + message);
    console.log('[MOCK SMS] Conversation ID: ' + conversationId);
    console.log('='.repeat(50) + '\n');

    // Simulate an automatic response after a delay (for demo purposes)
    this.scheduleSimulatedResponse(conversationId, patientId, phoneNumber, message);

    return {
      success: true,
      messageId,
      conversationId,
      timestamp: new Date(),
      provider: 'mock',
    };
  }

  private scheduleSimulatedResponse(
    conversationId: string,
    patientId: string,
    phoneNumber: string,
    originalMessage: string
  ): void {
    // Simulate a patient response after 2 seconds
    setTimeout(() => {
      const conversation = mockConversations.get(conversationId);
      if (!conversation) return;

      // Generate a contextual response based on the original message
      let responseText = 'Thank you for the message.';
      const lowerMessage = originalMessage.toLowerCase();

      if (lowerMessage.includes('appointment') || lowerMessage.includes('confirm')) {
        responseText = 'Yes, I confirm my appointment. See you then!';
      } else if (lowerMessage.includes('medication') || lowerMessage.includes('prescription')) {
        responseText = 'I have been taking my medications as prescribed.';
      } else if (lowerMessage.includes('feeling') || lowerMessage.includes('how are you')) {
        responseText = 'I am feeling better, thank you for checking in!';
      } else if (lowerMessage.includes('?')) {
        responseText = 'Yes, that sounds good to me.';
      }

      const response: PatientResponse = {
        conversationId,
        patientId,
        message: responseText,
        receivedAt: new Date(),
        fromNumber: phoneNumber,
      };

      conversation.pendingResponse = response;
      conversation.messages.push({
        direction: 'inbound',
        content: responseText,
        timestamp: new Date(),
      });

      console.log('\n' + '-'.repeat(50));
      console.log('[MOCK SMS] Response received from: ' + phoneNumber);
      console.log('[MOCK SMS] Response: ' + responseText);
      console.log('[MOCK SMS] Use "check responses ' + conversationId + '" to view');
      console.log('-'.repeat(50) + '\n');
    }, 2000);
  }

  async checkResponses(conversationId: string): Promise<PatientResponse | null> {
    const conversation = mockConversations.get(conversationId);
    if (!conversation || !conversation.pendingResponse) {
      return null;
    }

    const response = conversation.pendingResponse;
    // Clear the pending response once read
    conversation.pendingResponse = undefined;
    return response;
  }

  getConversationHistory(conversationId: string): MockConversation | null {
    return mockConversations.get(conversationId) || null;
  }
}

// ============================================
// Twilio Provider
// ============================================

class TwilioMessagingProvider {
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;
  private pendingResponses: Map<string, PatientResponse> = new Map();

  constructor(accountSid: string, authToken: string, phoneNumber: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.phoneNumber = phoneNumber;
  }

  async sendMessage(
    phoneNumber: string,
    message: string,
    patientId: string
  ): Promise<MessageResult> {
    const conversationId = generateConversationId();

    try {
      // Use fetch to call Twilio API directly (avoiding external dependency)
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;

      const formData = new URLSearchParams();
      formData.append('To', phoneNumber);
      formData.append('From', this.phoneNumber);
      formData.append('Body', message);
      // StatusCallback could be set here for webhook responses

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(this.accountSid + ':' + this.authToken).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        return {
          success: false,
          conversationId,
          error: errorData.message || 'Failed to send message',
          timestamp: new Date(),
          provider: 'twilio',
        };
      }

      const data = await response.json() as { sid: string };

      return {
        success: true,
        messageId: data.sid,
        conversationId,
        timestamp: new Date(),
        provider: 'twilio',
      };
    } catch (error) {
      return {
        success: false,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        provider: 'twilio',
      };
    }
  }

  async checkResponses(conversationId: string): Promise<PatientResponse | null> {
    // In a real implementation, this would query Twilio for incoming messages
    // or check a webhook endpoint. For now, we'll return any pending response.
    const response = this.pendingResponses.get(conversationId);
    if (response) {
      this.pendingResponses.delete(conversationId);
      return response;
    }
    return null;
  }

  /**
   * Handle incoming webhook from Twilio
   * This would be called by your webhook endpoint
   */
  handleIncomingMessage(
    from: string,
    body: string,
    conversationId: string,
    patientId: string
  ): void {
    const response: PatientResponse = {
      conversationId,
      patientId,
      message: body,
      receivedAt: new Date(),
      fromNumber: from,
    };
    this.pendingResponses.set(conversationId, response);
  }
}

// ============================================
// Provider Factory
// ============================================

const mockProvider = new MockMessagingProvider();
let twilioProvider: TwilioMessagingProvider | null = null;

function getProvider(): MockMessagingProvider | TwilioMessagingProvider {
  const config = getMessagingConfig();

  if (config.mode === 'twilio' && config.twilio) {
    if (!twilioProvider) {
      twilioProvider = new TwilioMessagingProvider(
        config.twilio.accountSid,
        config.twilio.authToken,
        config.twilio.phoneNumber
      );
    }
    return twilioProvider;
  }

  return mockProvider;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get patient phone number from FHIR
 * Looks for telecom entries with system='phone'
 */
export async function getPatientPhone(
  patientId: string,
  client?: EHRClient
): Promise<string | null> {
  try {
    // Create client if not provided
    const ehrClient =
      client || new EHRClient({ baseUrl: getConfig().fhirBaseUrl });

    const patient = await ehrClient.getPatient(patientId);

    if (!patient.telecom || patient.telecom.length === 0) {
      return null;
    }

    // Look for mobile phone first, then any phone
    const mobilePhone = patient.telecom.find(
      (t) => t.system === 'phone' && t.use === 'mobile'
    );
    if (mobilePhone?.value) {
      return normalizePhoneNumber(mobilePhone.value);
    }

    const anyPhone = patient.telecom.find((t) => t.system === 'phone');
    if (anyPhone?.value) {
      return normalizePhoneNumber(anyPhone.value);
    }

    return null;
  } catch (error) {
    console.error('Error fetching patient phone:', error);
    return null;
  }
}

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If no country code, assume US (+1)
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = '+1' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = '+' + cleaned;
    }
  }

  return cleaned;
}

/**
 * Format patient name for display in messages
 */
function formatPatientNameForMessage(patient: FHIRPatient): string {
  if (patient.name && patient.name.length > 0) {
    const name = patient.name[0];
    if (name.given && name.given.length > 0) {
      return name.given[0];
    }
    if (name.text) {
      return name.text.split(' ')[0];
    }
  }
  return 'Patient';
}

// ============================================
// Core Functions
// ============================================

/**
 * Send SMS to a patient
 *
 * @param patientId - The patient's FHIR resource ID
 * @param message - The message to send
 * @param client - Optional EHRClient to use for looking up patient data
 * @returns MessageResult with success status and conversation ID
 */
export async function sendPatientMessage(
  patientId: string,
  message: string,
  client?: EHRClient
): Promise<MessageResult> {
  const provider = getProvider();

  // Look up patient phone number
  const phoneNumber = await getPatientPhone(patientId, client);

  if (!phoneNumber) {
    return {
      success: false,
      conversationId: '',
      error: 'No phone number found for patient ' + patientId,
      timestamp: new Date(),
      provider: getMessagingConfig().mode,
    };
  }

  return provider.sendMessage(phoneNumber, message, patientId);
}

/**
 * Send SMS to a patient with a phone number directly provided
 *
 * @param phoneNumber - The phone number to send to
 * @param message - The message to send
 * @param patientId - The patient's FHIR resource ID (for tracking)
 * @returns MessageResult with success status and conversation ID
 */
export async function sendMessageToPhone(
  phoneNumber: string,
  message: string,
  patientId: string
): Promise<MessageResult> {
  const provider = getProvider();
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  return provider.sendMessage(normalizedPhone, message, patientId);
}

/**
 * Check for patient responses to a conversation
 *
 * @param conversationId - The conversation ID from sendPatientMessage
 * @returns PatientResponse if available, null otherwise
 */
export async function checkResponses(
  conversationId: string
): Promise<PatientResponse | null> {
  const provider = getProvider();
  return provider.checkResponses(conversationId);
}

/**
 * Get conversation history (mock mode only)
 *
 * @param conversationId - The conversation ID
 * @returns The conversation history or null
 */
export function getConversationHistory(conversationId: string): MockConversation | null {
  if (getMessagingConfig().mode === 'mock') {
    return mockProvider.getConversationHistory(conversationId);
  }
  return null;
}

// ============================================
// High-level convenience functions
// ============================================

/**
 * Send an appointment reminder to a patient
 */
export async function sendAppointmentReminder(
  patientId: string,
  appointmentDate: string,
  appointmentTime: string,
  client?: EHRClient
): Promise<MessageResult> {
  const message =
    'Reminder: You have an appointment scheduled for ' +
    appointmentDate +
    ' at ' +
    appointmentTime +
    '. Please reply YES to confirm or call to reschedule.';

  return sendPatientMessage(patientId, message, client);
}

/**
 * Send a medication reminder to a patient
 */
export async function sendMedicationReminder(
  patientId: string,
  medicationName: string,
  client?: EHRClient
): Promise<MessageResult> {
  const message =
    'Reminder: Please remember to take your ' +
    medicationName +
    ' as prescribed. Reply if you have any questions.';

  return sendPatientMessage(patientId, message, client);
}

/**
 * Ask a patient a question
 */
export async function askPatientQuestion(
  patientId: string,
  question: string,
  client?: EHRClient
): Promise<MessageResult> {
  return sendPatientMessage(patientId, question, client);
}

// ============================================
// Export for CLI integration
// ============================================

export default {
  sendPatientMessage,
  sendMessageToPhone,
  checkResponses,
  getPatientPhone,
  getMessagingConfig,
  setMessagingMode,
  getConversationHistory,
  sendAppointmentReminder,
  sendMedicationReminder,
  askPatientQuestion,
};
