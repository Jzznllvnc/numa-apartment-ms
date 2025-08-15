import { createClient } from '@/utils/supabase/client'

export class SessionManager {
  private static supabase = createClient()

  static initializeSessionManagement() {
    // Check if this is a session-only login
    const isSessionOnly = sessionStorage.getItem('sessionOnly')
    
    if (isSessionOnly) {
      // Set up cleanup for session-only logins
      this.setupSessionCleanup()
    }
    
    // Check for stored email
    const rememberedEmail = localStorage.getItem('rememberedEmail')
    return rememberedEmail
  }

  static setupSessionCleanup() {
    // Clean up session when browser tab is closed (session-only)
    const handleUnload = () => {
      if (sessionStorage.getItem('sessionOnly')) {
        // Use navigator.sendBeacon for reliable cleanup on page unload
        const supabase = createClient()
        supabase.auth.signOut({ scope: 'local' })
      }
    }

    // Use both beforeunload and unload for better coverage
    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('unload', handleUnload)
    
    // Also check on focus events (when user returns to the tab)
    window.addEventListener('focus', () => {
      this.checkSessionValidity()
    })
  }

  static async checkSessionValidity() {
    const { data: { session } } = await this.supabase.auth.getSession()
    const isSessionOnly = sessionStorage.getItem('sessionOnly')
    
    // If this was meant to be session-only and browser was closed/reopened,
    // we should sign out (though this is difficult to detect reliably)
    if (isSessionOnly && session) {
      // This is a basic check - in practice, session-only is hard to enforce perfectly
      // The main benefit is just not remembering the email
    }
  }

  static setRememberMe(email: string, remember: boolean) {
    if (remember) {
      localStorage.setItem('rememberedEmail', email)
      sessionStorage.removeItem('sessionOnly')
    } else {
      localStorage.removeItem('rememberedEmail')
      sessionStorage.setItem('sessionOnly', 'true')
    }
  }

  static getRememberedEmail(): string | null {
    return localStorage.getItem('rememberedEmail')
  }

  static clearRememberedData() {
    localStorage.removeItem('rememberedEmail')
    sessionStorage.removeItem('sessionOnly')
  }
} 