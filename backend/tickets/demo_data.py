"""Curated resolved tickets for testing semantic similarity in ResolveDesk."""

from datetime import datetime, timedelta, timezone


DEMO_BATCH_KEY = "resolveddesk-resolved-demo-v1"


def build_resolved_demo_tickets():
    """Return 25 resolved examples with useful descriptions and actionable notes."""
    examples = [
        # Account (7)
        ("Cannot sign in after changing my password", "After resetting my password, the login page keeps rejecting the new password. I can access my email normally.", "Account", "We found that the password reset completed but the active login session retained an outdated credential token. We invalidated the old session and completed a fresh password reset. The user confirmed successful sign-in."),
        ("Account locked after several login attempts", "My account says it is locked even though I am entering the correct password now.", "Account", "We've unlocked your account after checking that it belongs to you. Please try signing in again with your current password."),
        ("Verification code never arrives", "I am trying to verify my email address, but the one-time code is not appearing in my inbox.", "Account", "We've sent a fresh verification code to your registered email address. Please check your inbox and spam folder, then use the latest code to verify your account."),
        ("I cannot update the email on my profile", "The save button does not update my account email and the old address is still displayed.", "Account", "We've restarted the email-change process and sent a new confirmation link. Open that link to finish updating your email address."),
        ("Two-factor authentication blocks account access", "I lost access to my authenticator device and cannot get past the second security step.", "Account", "After confirming your account details, we've reset the old authenticator setup. Please sign in and follow the steps to connect your new authenticator app."),
        ("Password reset link says it has expired", "The recovery email contains a link that is already expired when I click it.", "Account", "We've sent you a new password reset link. Please use the latest email, as older reset links are no longer valid."),
        ("My account details revert after saving", "I change my display name and phone number, but the old values return when I reopen my profile.", "Account", "We've fixed the profile update issue. Please save your name and phone number again. Your updated details should now remain in your account."),
        # Technical (6)
        ("PDF documents fail during upload", "Uploading a large PDF returns an error, while small documents are accepted without any problem.", "Technical", "We've fixed the PDF upload issue. Please try uploading your document again. Larger PDF files should now upload successfully."),
        ("Dashboard remains stuck on the loading screen", "The home page spinner never disappears even though other parts of the application are working.", "Technical", "We've fixed the dashboard loading issue. Please refresh the page and try again. Your dashboard should now load normally."),
        ("Application returns an error after submitting a form", "Every time I submit the contact form, the page shows a server error and no confirmation.", "Technical", "We've fixed the form submission issue. Please submit the form again. You should now see the confirmation message after it is sent."),
        ("Search results do not reflect the latest changes", "I update a record but searching for its new name still shows the previous result.", "Technical", "We've fixed the search update issue. Try searching for the updated name again. The latest changes should now appear in your results."),
        ("Page layout breaks on a smaller laptop screen", "Some buttons and form fields extend beyond the right edge when I use a smaller browser window.", "Technical", "We've adjusted the page layout for smaller screens. Please refresh the page and try again. The buttons and form fields should now fit within your screen."),
        ("The application signs me out unexpectedly", "My session ends while I am still using the application and I have to log in again.", "Technical", "We've corrected the session timeout issue. Please sign in again. Your session should now remain active for the expected period while you use the application."),
        # Billing (6)
        ("Money deducted but my plan is not active", "My bank shows a successful charge, but the account still says I am on the free plan.", "Billing", "Your payment was successful, but your plan was not activated correctly. We've fixed the activation issue, and your paid features should now be available. You have not been charged again."),
        ("I was charged twice for one subscription", "There are two identical charges on my statement for a single subscription renewal.", "Billing", "We've identified the duplicate payment and started reversing the extra charge. You should receive the refund for the additional payment within your bank's processing period. You only need to pay once for your subscription."),
        ("Invoice has the wrong billing address", "The latest invoice contains my previous company address instead of the updated billing address.", "Billing", "We've corrected the billing address and issued an updated invoice. Please download the latest invoice from your account."),
        ("Refund has not reached my bank account", "The refund status says processed, but the amount is not visible in my bank statement yet.", "Billing", "Your refund has been processed from our side. It may take a few business days to appear in your bank account, depending on your bank. You can use the refund reference shared by our team if you need to check its status."),
        ("Subscription renewal failed despite a valid card", "My card is active and has enough balance, but the automatic renewal keeps failing.", "Billing", "We've fixed the saved payment method issue and your subscription renewal has now gone through. Your subscription has been extended. Please check your account to confirm the updated expiry date."),
        ("Tax amount on checkout looks incorrect", "The tax shown at checkout does not match the rate for my billing location.", "Billing", "We've corrected your billing location and updated the tax calculation. Please review the checkout total again before making your payment."),
        # General (6)
        ("I cannot find the confirmation email", "The action completed on the website, but I did not receive the confirmation message.", "General", "We've sent the confirmation email again. Please check your inbox and spam folder. You can mark our email address as a safe sender to help receive future updates."),
        ("Exported report contains incomplete rows", "The downloaded spreadsheet is missing some records that are visible in the application.", "General", "We've fixed the report export issue. Please download the report again. It should now include all records that match your selected filters."),
        ("I need help changing notification preferences", "I keep receiving update emails and cannot find where to turn off the ones I do not need.", "General", "We've updated the notification preferences guidance. Open Settings, choose Notification Preferences, and turn off the optional updates you no longer want to receive. Important account messages will still be sent."),
        ("Date displayed in the report is one day behind", "The report shows yesterday's date for records created late at night in my local time zone.", "General", "We've corrected how dates are displayed in reports. Please refresh or download the report again. The dates should now match your local time."),
        ("I submitted a request but received no reference number", "The confirmation page appeared, but I cannot see a ticket number to track the request.", "General", "We've fixed the confirmation page so it now displays your ticket reference after submission. Please submit a new request if you still need a reference for an earlier request."),
        ("Help page links lead to an unavailable page", "Several links in the help section open a not found page instead of the relevant instructions.", "General", "We've updated the help-page links. Please try opening the article again. The links should now take you to the correct help information."),
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
