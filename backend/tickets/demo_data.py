"""Curated resolved tickets for testing semantic similarity in ResolveDesk."""

from datetime import datetime, timedelta, timezone


DEMO_BATCH_KEY = "resolveddesk-resolved-demo-v1"


def build_resolved_demo_tickets():
    """Return 25 resolved examples with useful descriptions and actionable notes."""
    examples = [
        # Account (7)
        ("Cannot sign in after changing my password", "After resetting my password, the login page keeps rejecting the new password. I can access my email normally.", "Account", "We found that the password reset completed but the active login session retained an outdated credential token. We invalidated the old session and completed a fresh password reset. The user confirmed successful sign-in."),
        ("Account locked after several login attempts", "My account says it is locked even though I am entering the correct password now.", "Account", "The security policy temporarily locked the account after repeated failed attempts. We verified the account owner, cleared the temporary lock, and asked the user to sign in with the current password. Access was restored."),
        ("Verification code never arrives", "I am trying to verify my email address, but the one-time code is not appearing in my inbox.", "Account", "The verification messages were being delayed by the mail provider. We checked the registered address, cleared an outdated pending verification request, and sent a fresh code. The user received it and completed verification."),
        ("I cannot update the email on my profile", "The save button does not update my account email and the old address is still displayed.", "Account", "The email update was waiting for confirmation from the previous session. We restarted the email-change flow and verified the new address using the confirmation link. The profile now displays the updated email."),
        ("Two-factor authentication blocks account access", "I lost access to my authenticator device and cannot get past the second security step.", "Account", "After verifying account ownership through the approved recovery checks, we reset the old two-factor enrollment and provided a new setup flow. The user enrolled a replacement authenticator and successfully signed in."),
        ("Password reset link says it has expired", "The recovery email contains a link that is already expired when I click it.", "Account", "The reset link had exceeded its validity period. We invalidated the expired token and generated a new password reset email. The user used the latest link within its validity window and confirmed access."),
        ("My account details revert after saving", "I change my display name and phone number, but the old values return when I reopen my profile.", "Account", "The profile form was sending stale field values from a cached form state. We corrected the update payload, saved the latest profile fields, and verified persistence after signing out and back in."),
        # Technical (6)
        ("PDF documents fail during upload", "Uploading a large PDF returns an error, while small documents are accepted without any problem.", "Technical", "The upload service had a request-size limit lower than the supported document size. We aligned the server limit and validation message, then tested with a representative large PDF. The upload completed successfully."),
        ("Dashboard remains stuck on the loading screen", "The home page spinner never disappears even though other parts of the application are working.", "Technical", "A dashboard request was waiting on a slow aggregate query and did not handle the timeout cleanly. We optimized the query, added a bounded timeout response, and verified that the dashboard loads with the expected ticket counts."),
        ("Application returns an error after submitting a form", "Every time I submit the contact form, the page shows a server error and no confirmation.", "Technical", "The API rejected an optional field that the frontend sent as an empty string. We normalized the optional value before validation and tested both populated and empty submissions. The form now returns the expected confirmation."),
        ("Search results do not reflect the latest changes", "I update a record but searching for its new name still shows the previous result.", "Technical", "The search index was not refreshed after updates. We corrected the update event so the indexed document is refreshed after a successful save, then verified searches using both the old and new values."),
        ("Page layout breaks on a smaller laptop screen", "Some buttons and form fields extend beyond the right edge when I use a smaller browser window.", "Technical", "The page used a fixed-width content section that exceeded smaller viewport sizes. We replaced the fixed width with responsive layout constraints and checked the form at common laptop and tablet widths."),
        ("The application signs me out unexpectedly", "My session ends while I am still using the application and I have to log in again.", "Technical", "The session cookie lifetime was shorter than the configured application session policy. We aligned the cookie and server session settings, restarted the service, and confirmed that the session remains active for the expected duration."),
        # Billing (6)
        ("Money deducted but my plan is not active", "My bank shows a successful charge, but the account still says I am on the free plan.", "Billing", "The payment provider confirmed the charge, but its activation callback had timed out. We verified the transaction reference, safely replayed the activation event, and confirmed that the paid plan is active without creating a duplicate charge."),
        ("I was charged twice for one subscription", "There are two identical charges on my statement for a single subscription renewal.", "Billing", "We compared both transaction references and confirmed that one was a duplicate authorization. The duplicate charge was voided through the payment provider, and the user was given the expected refund timeline and reference."),
        ("Invoice has the wrong billing address", "The latest invoice contains my previous company address instead of the updated billing address.", "Billing", "The invoice was generated from a saved billing snapshot created before the profile change. We updated the billing details for future invoices and issued a corrected invoice for the affected transaction."),
        ("Refund has not reached my bank account", "The refund status says processed, but the amount is not visible in my bank statement yet.", "Billing", "The payment provider confirmed that the refund was issued and supplied a settlement reference. We shared the reference and expected bank processing window with the user, then verified that no additional action was required from the application."),
        ("Subscription renewal failed despite a valid card", "My card is active and has enough balance, but the automatic renewal keeps failing.", "Billing", "The payment gateway had an outdated payment token for the saved card. We refreshed the payment method token with the user's approval and retried the renewal once. The transaction succeeded and the subscription was extended."),
        ("Tax amount on checkout looks incorrect", "The tax shown at checkout does not match the rate for my billing location.", "Billing", "The checkout calculation used the account's old billing region. We corrected the saved billing location, recalculated the tax using the configured regional rule, and verified the updated total before payment."),
        # General (6)
        ("I cannot find the confirmation email", "The action completed on the website, but I did not receive the confirmation message.", "General", "The confirmation email was delivered to the address on file but was routed to the spam folder. We verified the delivery event, resent the confirmation, and advised the user to allowlist the sender. The user confirmed receipt."),
        ("Exported report contains incomplete rows", "The downloaded spreadsheet is missing some records that are visible in the application.", "General", "The export process was applying the current page limit instead of retrieving the complete filtered result set. We corrected the export query to use the full filter criteria and verified the row count against the application."),
        ("I need help changing notification preferences", "I keep receiving update emails and cannot find where to turn off the ones I do not need.", "General", "We guided the user to the notification preferences section and clarified the difference between essential account messages and optional activity updates. The user saved the preferred settings and confirmed the expected notifications."),
        ("Date displayed in the report is one day behind", "The report shows yesterday's date for records created late at night in my local time zone.", "General", "The report displayed UTC timestamps without converting them to the user's configured time zone. We corrected the display conversion while keeping timestamps stored in UTC, then verified records around midnight."),
        ("I submitted a request but received no reference number", "The confirmation page appeared, but I cannot see a ticket number to track the request.", "General", "The request was saved successfully, but the confirmation response omitted the generated reference. We updated the confirmation payload to include the persisted ticket identifier and verified the reference appears after submission."),
        ("Help page links lead to an unavailable page", "Several links in the help section open a not found page instead of the relevant instructions.", "General", "The help links referenced an older documentation path. We updated the routes to the current help articles and checked each affected link from the help page."),
    ]

    now = datetime.now(timezone.utc)
    tickets = []
    for index, (title, description, category, resolution_note) in enumerate(examples):
        created_at = now - timedelta(days=30 - index, hours=index % 7)
        tickets.append({
            "title": title,
            "description": description,
            "category": category,
            "status": "Resolved",
            "resolution_note": resolution_note,
            "created_at": created_at,
            "updated_at": created_at + timedelta(hours=1),
        })
    return tickets
