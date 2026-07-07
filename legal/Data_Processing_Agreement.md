# Data Processing Agreement (DPA)

**Last Updated:** July 2026
**Company:** PT DagangOS Digital Indonesia

This DPA applies to Enterprise Clients where PT DagangOS Digital Indonesia ("Processor") processes Personal Data on behalf of the Client ("Controller") in the course of providing support, maintenance, or SaaS services.

## 1. Roles and Responsibilities
* **Controller (Client):** Determines the purposes and means of processing Personal Data (e.g., your customers' data stored in the CRM or E-commerce database).
* **Processor (DagangOS):** Processes Personal Data strictly on behalf of the Controller when performing maintenance, debugging, or platform upgrades.

**Infrastructure Note:** Because the database and servers reside on the Client's Infrastructure, the Client is the primary guardian of the data. DagangOS acts as a Processor only when accessing the system to provide contracted Services.

## 2. Processing Details
* **Subject Matter:** Maintenance and technical support of the DagangOS Platform.
* **Nature of Processing:** Viewing logs, querying databases for debugging, applying migrations.
* **Types of Data:** Names, emails, addresses, transaction histories, and IP addresses of the Controller's end-users.

## 3. Security Measures
The Processor commits to maintaining appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including:
* Access controls (VPNs, 2FA) for DagangOS engineers accessing Client Infrastructure.
* Principle of least privilege when issuing database credentials.
* Immediate revocation of access for offboarded DagangOS personnel.

## 4. Subprocessors
The Processor may engage third-party Subprocessors (e.g., AI API providers, error tracking software) to assist in providing the Services. The Controller grants general authorization for the use of Subprocessors, provided the Processor maintains a list of active Subprocessors and notifies the Controller of any changes.

## 5. Personal Data Breach Notification
If the Processor becomes aware of a security breach affecting the Controller's Personal Data caused by the Processor's actions, the Processor will notify the Controller without undue delay (target: within 48 hours). 
*Note: If the breach occurs due to the Controller's failure to secure their VPS or AWS account, DagangOS is not liable.*

## 6. Assistance
The Processor will reasonably assist the Controller in fulfilling their obligations to respond to Data Subject Requests (e.g., GDPR Right to Access or Deletion) by providing necessary technical tools within the Platform.

## 7. Data Deletion and Return
Upon termination of the Services, the Processor will securely destroy any local copies or backups of the Controller's Personal Data held on DagangOS networks. Since the primary database resides on the Client's Infrastructure, the Client retains ultimate control and responsibility for deleting their own data.

## 8. Audit Rights
The Controller has the right to request audits or inspections of the Processor's compliance with this DPA, subject to reasonable advance notice (minimum 30 days) and confidentiality agreements. Audits are strictly limited to policies and procedures relevant to the Services and do not grant access to DagangOS proprietary source code or other clients' environments.
