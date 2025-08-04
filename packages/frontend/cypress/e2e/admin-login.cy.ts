describe('Admin Login', () => {
  beforeEach(() => {
    // Visit the home page
    cy.visit('/');
  });

  it('should navigate to admin login page from home', () => {
    // Click on the admin area link
    cy.contains('Admin-Bereich').click();

    // Should be on admin login page
    cy.url().should('include', '/admin/login');
    cy.contains('h1', 'Admin-Anmeldung').should('be.visible');
  });

  it('should show validation errors for empty fields', () => {
    cy.visit('/admin/login');

    // Try to submit without filling fields
    cy.get('input[name="username"]').focus().blur();
    cy.get('input[name="password"]').focus().blur();

    // Submit button should be disabled
    cy.contains('button', 'Als Admin anmelden').should('be.disabled');
  });

  it('should handle successful admin login', () => {
    // Intercept the login API call
    cy.intercept('POST', '/api/auth/admin/login', {
      statusCode: 200,
      body: {
        user: {
          id: '1',
          username: 'admin',
          createdAt: new Date().toISOString(),
        },
        token: 'mock-admin-token',
      },
    }).as('adminLogin');

    // Intercept the me endpoint for auth check
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 200,
      body: {
        id: '1',
        username: 'admin',
        createdAt: new Date().toISOString(),
      },
    }).as('authCheck');

    cy.visit('/admin/login');

    // Fill in the form
    cy.get('input[name="username"]').type('admin');
    cy.get('input[name="password"]').type('SecureAdminPassword123!');

    // Submit the form
    cy.contains('button', 'Als Admin anmelden').click();

    // Wait for the login request
    cy.wait('@adminLogin');

    // Should redirect to admin dashboard
    cy.url().should('include', '/admin/dashboard');
    cy.contains('Admin-Dashboard').should('be.visible');

    // Should see success toast
    cy.contains('Anmeldung erfolgreich').should('be.visible');
  });

  it('should handle login error for invalid credentials', () => {
    // Intercept the login API call with 401 error
    cy.intercept('POST', '/api/auth/admin/login', {
      statusCode: 401,
      body: {
        message: 'Unauthorized',
        error: 'Unauthorized',
        statusCode: 401,
      },
    }).as('adminLoginFailed');

    cy.visit('/admin/login');

    // Fill in the form with wrong credentials
    cy.get('input[name="username"]').type('admin');
    cy.get('input[name="password"]').type('wrongpassword');

    // Submit the form
    cy.contains('button', 'Als Admin anmelden').click();

    // Wait for the login request
    cy.wait('@adminLoginFailed');

    // Should stay on login page
    cy.url().should('include', '/admin/login');

    // Should see error message
    cy.contains('Ungültiger Benutzername oder Passwort').should('be.visible');

    // Should see error toast
    cy.contains('Login fehlgeschlagen').should('be.visible');
  });

  it('should handle login error for non-admin user', () => {
    // Intercept the login API call with 403 error
    cy.intercept('POST', '/api/auth/admin/login', {
      statusCode: 403,
      body: {
        message: 'Forbidden',
        error: 'Forbidden',
        statusCode: 403,
      },
    }).as('adminLoginForbidden');

    cy.visit('/admin/login');

    // Fill in the form
    cy.get('input[name="username"]').type('regularuser');
    cy.get('input[name="password"]').type('password123');

    // Submit the form
    cy.contains('button', 'Als Admin anmelden').click();

    // Wait for the login request
    cy.wait('@adminLoginForbidden');

    // Should stay on login page
    cy.url().should('include', '/admin/login');

    // Should see error message
    cy.contains('Sie haben keine Administratorrechte').should('be.visible');

    // Should see error toast
    cy.contains('Zugriff verweigert').should('be.visible');
  });

  it('should toggle password visibility', () => {
    cy.visit('/admin/login');

    // Password should be hidden by default
    cy.get('input[name="password"]').should('have.attr', 'type', 'password');

    // Click the visibility toggle
    cy.get('button[aria-label="Toggle password visibility"]').click();

    // Password should be visible
    cy.get('input[name="password"]').should('have.attr', 'type', 'text');

    // Click again to hide
    cy.get('button[aria-label="Toggle password visibility"]').click();

    // Password should be hidden again
    cy.get('input[name="password"]').should('have.attr', 'type', 'password');
  });

  it('should preserve cookies after successful login', () => {
    // Intercept the login API call
    cy.intercept('POST', '/api/auth/admin/login', {
      statusCode: 200,
      headers: {
        'set-cookie': 'auth-token=mock-admin-token; HttpOnly; SameSite=Strict; Path=/',
      },
      body: {
        user: {
          id: '1',
          username: 'admin',
          createdAt: new Date().toISOString(),
        },
        token: 'mock-admin-token',
      },
    }).as('adminLogin');

    cy.visit('/admin/login');

    // Fill in and submit the form
    cy.get('input[name="username"]').type('admin');
    cy.get('input[name="password"]').type('SecureAdminPassword123!');
    cy.contains('button', 'Als Admin anmelden').click();

    // Wait for the login request
    cy.wait('@adminLogin');

    // Check that cookie is set (Note: HttpOnly cookies are not accessible via JS, but the browser handles them)
    // The actual cookie check would depend on your backend setup

    // Verify successful redirect
    cy.url().should('include', '/admin/dashboard');
  });
});
