# Service Level Agreement (SLA)

**Last Updated:** July 2026
**Company:** DagangOS Digital Indonesia

This SLA outlines the support targets, response times, and availability commitments for clients subscribed to active Maintenance and Support packages with DagangOS Digital Indonesia.

## Support Hours
Standard Support Operations: **Monday – Friday, 09:00 WIB to 18:00 WIB**, excluding Indonesian national holidays.

## Incident Severity & Response Times

### 1. Critical Priority
**Definition:** Complete platform outage; critical path (e.g., checkout, POS terminal) is completely broken and blocking core business revenue.
**Initial Response Time:** Within 2 business hours.
**Resolution Target:** Within 8 business hours.

### 2. High Priority
**Definition:** Major feature malfunction causing significant business disruption, but a workaround exists. Core revenue generation is largely functional.
**Initial Response Time:** Within 4 business hours.
**Resolution Target:** Within 24 business hours.

### 3. Medium Priority
**Definition:** Minor bugs, visual glitches, or degraded performance that do not significantly impact daily operations.
**Initial Response Time:** Within 1 business day.
**Resolution Target:** Addressed in the next scheduled maintenance patch or within 3 business days.

### 4. Low Priority
**Definition:** General inquiries, feature requests, or minor content updates.
**Initial Response Time:** Within 2 business days.
**Resolution Target:** Evaluated for future roadmap or addressed as scheduled.

## Maintenance Windows
DagangOS reserves the right to perform scheduled system updates. Scheduled maintenance will be communicated at least 48 hours in advance and will typically occur during low-traffic periods (e.g., 01:00 - 05:00 WIB).

## Emergency Maintenance
In the event of critical security vulnerabilities (e.g., zero-day exploits), DagangOS may perform emergency maintenance without prior notice.

## Availability Target & Infrastructure Disclaimer
Because DagangOS operates a **Client-Owned Infrastructure Model**, our ability to guarantee 99.9% uptime is strictly limited to the software application layer. 
* We **cannot** guarantee uptime or be held liable for SLA breaches caused by your VPS provider (e.g., AWS, DigitalOcean going down), your DNS provider, or your payment gateway failing.

## Backups
Clients are responsible for configuring automated backups on their VPS and Database providers. If DagangOS is contracted for Managed Maintenance, we will ensure automated daily database backups are configured to retain the last 30 days of data.

## Disaster Recovery
In the event of catastrophic server failure (e.g., Client's VPS is terminated), DagangOS will assist in restoring the platform from the latest available backup to a new server provisioned by the Client. Time spent on disaster recovery is billable at standard hourly rates unless explicitly covered in a Managed Enterprise contract.
