# QA Testing Report

## Overview
Manual QA testing was performed to identify functional and UI issues
during the user journey.

## Tested Areas
- Book browsing
- Book reviews
- Purchase flow
- Delivery methods
- Achievements
- "Read Together" functionality

## Found Issues

### BUG-001 â-  Quote block layout issue
Type: UI / Visual
Severity: Minor
Status: Open

Description:
The colored background does not fully cover the quote block.
The issue occurs across different color combinations.

---

### BUG-002 â-  Comment function is not working
Type: Functional
Severity: Major
Status: Open

Description:
When viewing book reviews before purchase, clicking the comment
button produces no response.

---

### BUG-003 -  Pickup delivery method changes to courier
Type: Functional
Severity: Major
Status: Open

Description:
When "Self-pickup" is selected during checkout, the final
confirmation page incorrectly displays "Courier" as the delivery method.

---

### BUG-004 â- "Read Together" progress is not counted in achievements
Type: Functional
Severity: Major
Status: Open

Description:
Pages and books read through the "Read Together" feature are not
included in the achievements counters for total pages and books read.
