// Session configuration
export const SESSION_CONFIG = {
    maxSessionAge: 24 * 60 * 60 * 1000, // 24 hours
    inactivityTimeout: 30 * 60 * 1000,   // 30 minutes
    warningBeforeExpiry: 5 * 60 * 1000,  // 5 minutes warning
    activityCheckInterval: 60 * 1000,     // Check every minute
};

const LAST_ACTIVITY_KEY = 'travex_last_activity';
const SESSION_START_KEY = 'travex_session_start';

export class SessionManager {
    private activityCheckInterval: NodeJS.Timeout | null = null;
    private onExpireCallback: (() => void) | null = null;
    private onWarningCallback: (() => void) | null = null;

    /**
     * Initialize session tracking
     */
    start(onExpire?: () => void, onWarning?: () => void) {
        if (typeof window === 'undefined') return;

        this.onExpireCallback = onExpire || null;
        this.onWarningCallback = onWarning || null;

        // Set session start time if not exists
        const sessionStart = localStorage.getItem(SESSION_START_KEY);
        if (!sessionStart) {
            localStorage.setItem(SESSION_START_KEY, Date.now().toString());
        }

        // Update last activity
        this.updateActivity();

        // Set up activity listeners
        this.setupActivityListeners();

        // Start periodic checks
        this.startActivityCheck();
    }

    /**
     * Stop session tracking
     */
    stop() {
        if (this.activityCheckInterval) {
            clearInterval(this.activityCheckInterval);
            this.activityCheckInterval = null;
        }
        this.removeActivityListeners();
    }

    /**
     * Update last activity timestamp
     */
    updateActivity() {
        if (typeof window === 'undefined') return;
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }

    /**
     * Get last activity timestamp
     */
    getLastActivity(): number {
        if (typeof window === 'undefined') return Date.now();
        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        return lastActivity ? parseInt(lastActivity, 10) : Date.now();
    }

    /**
     * Get session start timestamp
     */
    getSessionStart(): number {
        if (typeof window === 'undefined') return Date.now();
        const sessionStart = localStorage.getItem(SESSION_START_KEY);
        return sessionStart ? parseInt(sessionStart, 10) : Date.now();
    }

    /**
     * Check if session is expired
     */
    isSessionExpired(): boolean {
        const now = Date.now();
        const sessionStart = this.getSessionStart();
        const lastActivity = this.getLastActivity();

        // Check max session age
        if (now - sessionStart > SESSION_CONFIG.maxSessionAge) {
            return true;
        }

        // Check inactivity timeout
        if (now - lastActivity > SESSION_CONFIG.inactivityTimeout) {
            return true;
        }

        return false;
    }

    /**
     * Check if session is about to expire
     */
    isSessionAboutToExpire(): boolean {
        const now = Date.now();
        const lastActivity = this.getLastActivity();
        const timeUntilExpiry = SESSION_CONFIG.inactivityTimeout - (now - lastActivity);

        return timeUntilExpiry > 0 && timeUntilExpiry <= SESSION_CONFIG.warningBeforeExpiry;
    }

    /**
     * Clear session data
     */
    clearSession() {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        localStorage.removeItem(SESSION_START_KEY);
    }

    /**
     * Reset session (useful after re-authentication)
     */
    resetSession() {
        if (typeof window === 'undefined') return;
        localStorage.setItem(SESSION_START_KEY, Date.now().toString());
        this.updateActivity();
    }

    /**
     * Set up activity listeners
     */
    private setupActivityListeners() {
        if (typeof window === 'undefined') return;

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            window.addEventListener(event, this.handleActivity);
        });
    }

    /**
     * Remove activity listeners
     */
    private removeActivityListeners() {
        if (typeof window === 'undefined') return;

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            window.removeEventListener(event, this.handleActivity);
        });
    }

    /**
     * Handle activity event
     */
    private handleActivity = () => {
        this.updateActivity();
    };

    /**
     * Start periodic activity check
     */
    private startActivityCheck() {
        if (typeof window === 'undefined') return;

        this.activityCheckInterval = setInterval(() => {
            if (this.isSessionExpired()) {
                this.stop();
                if (this.onExpireCallback) {
                    this.onExpireCallback();
                }
            } else if (this.isSessionAboutToExpire()) {
                if (this.onWarningCallback) {
                    this.onWarningCallback();
                }
            }
        }, SESSION_CONFIG.activityCheckInterval);
    }
}

// Export singleton instance
export const sessionManager = new SessionManager();
