export interface Session {
  activePatient?: {
    id: string;
    name: string;
  };
  lastSearchResults?: Array<{ id: string; name: string }>;
  currentEncounter?: string;
}

class SessionManager {
  private session: Session = {};

  setActivePatient(id, name) {
    this.session.activePatient = { id, name };
  }

  getActivePatient() {
    return this.session.activePatient;
  }

  clearActivePatient() {
    this.session.activePatient = undefined;
  }

  setLastSearchResults(results) {
    this.session.lastSearchResults = results;
  }

  getLastSearchResults() {
    return this.session.lastSearchResults || [];
  }

  getPatientFromIndex(index) {
    const results = this.session.lastSearchResults;
    if (!results || index < 1 || index > results.length) return null;
    return results[index - 1];
  }

  setCurrentEncounter(encounterId) {
    this.session.currentEncounter = encounterId;
  }

  getCurrentEncounter() {
    return this.session.currentEncounter;
  }

  clear() {
    this.session = {};
  }

  getSummary() {
    const lines = [];
    if (this.session.activePatient) {
      lines.push('Active patient: ' + this.session.activePatient.name + ' (ID: ' + this.session.activePatient.id + ')');
    }
    if (this.session.lastSearchResults?.length) {
      lines.push('Last search: ' + this.session.lastSearchResults.length + ' results');
    }
    return lines.join('\n') || 'No active session context';
  }
}

export const session = new SessionManager();
export default session;
