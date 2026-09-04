# Specifications — Open Money

A personal finance app for personal use (non-commercial). Runs 100% locally on the phone, with no user accounts and no personal data stored in the cloud. No backend, no market data: investments are out of scope.

## 1. Recorded Decisions (Q&A with the owner)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Platform | Native app with React Native |
| 2 | Data | Personal data local only; the app works fully offline |
| 3 | Backend | Removed: no backend (investments out of scope) |
| 4 | Currencies | Multi-currency with EUR as the default base currency |
| 5 | Backup | Yes: full JSON export/import + CSV export of transactions |
| 6 | Accounts | No account types; free-form name + optional identifier; no commissions on transfers (if applicable, they are recorded as a separate expense) |
| 7 | Categories | Flat (no subcategories) |
| 8 | Security | No app lock in the MVP |
| 9 | Scope | No budgets, advanced reports, investment analysis, multi-user, or synchronization |

## 2. Technical Assumptions (subject to owner's approval)

- **Expo (managed workflow) + TypeScript** on React Native. Primary target: **Android** (APK installable directly from Windows). iOS would require macOS or EAS Build (cloud build service; does not store personal data) — deferred decision.
- **Local database: SQLite** (expo-sqlite). Tables: `accounts`, `transactions`, `categories`, `recurring_rules`, `exchange_rates`, `settings`.
- **Recurring transactions**: processed when the app is opened (no background execution on mobile without native services). Idempotent catch-up processing.
- **Fixed base currency: EUR** in the MVP.
- **App language: Spanish.**

## 3. Known Risks and Limitations

- The app works fully offline; exchange rates are managed manually.

## 4. Out of Scope (MVP)

Budgets; advanced reports/charts; technical investment analysis; multi-user; cross-device sync; account types; subcategories; commission field; PIN/biometric lock; Spanish investment funds; base currency change; widgets and push notifications.

---

## US-001: Technical Foundation [Done]
As a developer-owner, I want the project base (React Native app with navigation and local database) so that the rest of the features are built on a common infrastructure.

### Acceptance Criteria
- Given a first installation, When I open the app, Then the local database is created with the full schema and the base category catalog without errors.
- Given a new app version, When it is updated, Then schema migrations are applied without data loss.

### Tasks
- T-001: Create Expo + TypeScript project with folder structure, navigation (Dashboard, Transactions, Accounts, Settings) and basic visual theme.
- T-002: Integrate local SQLite with a data access layer and versioned migration system.
- T-003: Define complete schema: accounts, transactions, categories, recurring_rules, exchange_rates, settings.
- T-004: Initial seed of the base category catalog in Spanish on first launch.

## US-002: Account Management [Done]
As a user, I want to create, edit, and delete accounts with any name I choose to organize my money by banks, cash, or other categories.

### Acceptance Criteria
- Given the accounts screen, When I tap "new account" and save a name (required), optional identifier, currency (EUR by default), and initial balance, Then the account appears in the list with its calculated balance.
- Given an existing account, When I edit its data, Then the changes are reflected and the balance is recalculated.
- Given an account with no transactions, When I delete it, Then it disappears after confirmation.
- Given an account with transactions, When I try to delete it, Then I am warned of the number of associated transactions and the deletion (cascade) requires explicit confirmation.
- Given an account used in active recurring rules, When I try to delete it, Then the deletion is blocked until those rules are reassigned or deleted.
- Given several accounts, When I view the list, Then each account shows its balance in its currency and its EUR equivalent.

### Tasks
- T-006: Account list screen with per-account balance and EUR total.
- T-007: Account create/edit form (required name, optional identifier, currency, initial balance).
- T-008: Balance logic: initial balance + transactions + transfer legs.
- T-009: Account deletion: confirmation, transaction cascade, and block if active recurring transactions exist.

## US-003: Quick Transaction Entry [Done]
As a user, I want to record an income or expense in a few seconds with date, amount, account, category, and notes to keep a frictionless record.

### Acceptance Criteria
- Given the dashboard, When I tap a quick action (income, expense, or transfer), Then the transaction form opens with today's date, the tapped type preselected, and a numeric keypad for the amount.
- Given the form, When I select type (income/expense), amount > 0, account, and optional category, and save, Then the transaction is recorded and the account balance is updated.
- Given an existing transaction, When I open it from the list, Then I can edit all its fields or delete it with confirmation.
- Given the form, When I try to save without a valid amount or without an account, Then a validation error is shown and nothing is saved.

### Tasks
- T-010: Quick actions on the dashboard (income, expense, transfer) opening the transaction form.
- T-011: Quick transaction form (type, date picker, numeric amount, account, type-filtered category, notes).
- T-012: Transaction edit and delete with balance updates.
- T-013: Form validations (amount > 0, account required).

## US-004: Transaction List and Filtering [Done]
As a user, I want to list my transactions with filters by category, dates, account, and type to easily find and review movements.

### Acceptance Criteria
- Given the transactions screen, When I open it, Then I see transactions in reverse chronological order grouped by day with the daily total.
- Given the list, When I apply filters (category, date range, account, type income/expense/transfer, text search in notes), Then the list is filtered combining all criteria.
- Given active filters, When I view the list, Then the number of results and the net sum for the filtered period are displayed.
- Given a transaction in the list, When I tap it, Then its edit form opens.

### Tasks
- T-014: Transactions screen grouped by day with daily total.
- T-015: Filter bar: category, date range, account, type, and text search.
- T-016: Filtered results summary (number of transactions and net sum).
- T-017: SQLite queries with indexes for combined filters.

## US-005: Transfers Between Own Accounts [Done]
As a user, I want to transfer money between my accounts to move balance without recording income or expenses.

### Acceptance Criteria
- Given two own accounts, When I create a transfer with origin, destination, date, amount, and notes, Then the origin balance decreases, the destination balance increases, and a single "transfer" type movement appears in the list.
- Given accounts with different currencies, When I create the transfer, Then the exchange rate is requested (pre-filled with the current rate, editable) and origin and destination amounts are recorded.
- Given a transfer, When I edit or delete it, Then both legs are updated or reverted atomically.

### Tasks
- T-018: Transfer form (origin, destination, date, amount, notes) with validation origin ≠ destination.
- T-019: Currency exchange support in transfers with editable exchange rate.
- T-020: Atomic transfer model (single entity, two legs) and representation in the transaction list.

## US-006: Categories [Done]
As a user, I want a base catalog of categories in Spanish and to be able to create, edit, and delete my own categories to classify my transactions as I see fit.

### Acceptance Criteria
- Given the first launch, When the app is initialized, Then there is a base catalog (~20 expense and ~6 income categories) in Spanish.
- Given the categories screen, When I create a category with a name and type (income/expense), Then it becomes available in transaction forms of that type.
- Given a category in use by transactions, When I delete it with confirmation, Then its transactions move to "Uncategorized".
- Given a category used by active recurring rules, When I try to delete it, Then the deletion is blocked until those rules are reassigned or deleted.
- Given the base catalog, When I edit or delete any of its categories, Then it is allowed (there are no protected system categories).

### Tasks
- T-021: Category CRUD (name, type) with a management screen.
- T-022: Deletion rules: transactions move to "Uncategorized"; block if an active recurring transaction uses it.

## US-007: Multi-Currency [Done]
As a user, I want to manage accounts in different currencies with EUR as the base so that I can see all totals in euros.

### Acceptance Criteria
- Given an account, When I create it, Then I can choose its currency (EUR by default).
- Given the exchange rates screen, When I open it, Then I see rates against EUR, I can edit them manually, and see the last update date.
- Given any aggregate (total balances, net worth), When it is calculated, Then it is converted to EUR using the stored rates.

### Tasks
- T-023: Storage and manual editing of exchange rates against EUR.
- T-025: EUR conversion utility applied to all aggregates.

## US-008: Recurring Payments and Automation [Done]
As a user, I want to define periodic income, expenses, and transfers so that they are recorded automatically when they are due.

### Acceptance Criteria
- Given the recurring screen, When I create a rule (type: income/expense/transfer; transaction fields; frequency: weekly, monthly, yearly, or every N days; next execution; active), Then the rule is saved and visible with its next execution.
- Given overdue rules, When I open the app, Then all pending executions are processed automatically (catch-up) in an idempotent manner and the next execution is updated.
- Given that recurring transactions have been applied, When processing finishes, Then a notice "X recurring transactions have been applied" is shown with an option to undo the batch.
- Given a rule, When I pause it, Then it does not generate executions until reactivated; When I edit or delete it, Then the changes affect only future executions.

### Tasks
- T-026: Data model and form for recurring rules (all types and frequencies).
- T-027: Processing engine on app open: detection of overdue, multiple catch-up, idempotency.
- T-028: Post-processing notice with batch undo.
- T-029: Recurring screen: list with next execution, pause/resume, edit, delete.

## US-009: Market Data Backend [Discarded]
Discarded: investments are out of scope, so no backend exists. The app is 100% local and works fully offline.

## US-010: Investments — Instruments and Trades [Discarded]
Discarded: investments are out of scope. Migration v9 removed the `instruments` and `trades` tables and the `investment` recurring type.

## US-011: Portfolio (Simple View) [Discarded]
Discarded: investments are out of scope. Net worth is the sum of converted account balances.

## US-012: Dashboard [Done]
As a user, I want a main screen with my net worth, my recent transactions, and quick access to a new transaction to get a pulse on my finances at a glance.

### Acceptance Criteria
- Given the dashboard, When I open it, Then I see the net worth in EUR (sum of converted account balances).
- Given the dashboard, When I open it, Then I see an account summary (name and balance) and the last 15 transactions.
- Given the dashboard, When I tap a quick action (Ingreso, Gasto, Transferencia), Then the new transaction form opens with that type preselected.
- Given the dashboard, When I tap an account or a transaction, Then I navigate to the corresponding detail.

### Tasks
- T-040: Net worth calculation and display in EUR.
- T-041: Account summary section and last 15 transactions with navigation to detail.
- T-042: Quick actions on dashboard (income, expense, transfer) opening the transaction form with the type preselected.

## US-013: Backup and Export
As a user, I want to export/import a JSON backup of all my data and export transactions to CSV so I don't lose information since everything is local.

### Acceptance Criteria
- Given Settings, When I tap "Export backup", Then a JSON with all data (accounts, transactions, categories, recurring rules, exchange rates, settings) is generated and shared or saved via the system. Backups exported before investments were removed are still importable: their investment sections are ignored.
- Given a JSON backup file, When I tap "Import backup" and confirm the replacement, Then the local data is replaced with the file's data and the app remains consistent.
- Given Settings, When I tap "Export transactions CSV", Then a CSV with date, type, amount, currency, account, category, and notes is generated and shared or saved.
- Given an import in progress, When the file fails (invalid format), Then no data is modified and a clear error is shown.

### Tasks
- T-043: Full JSON export with system share sheet.
- T-044: JSON import with replacement confirmation and format validation (transactional).
- T-045: Transactions CSV export.

---

## Suggested Implementation Order

US-001 → US-002 → US-003 → US-006 → US-004 → US-005 → US-007 → US-008 → US-012 → US-013

## MVP Definition

The MVP includes all user stories except the discarded investment ones (US-009, US-010, US-011): everything explicitly requested by the owner is within the MVP and nothing requested is deferred. What is listed in the "Out of Scope" section is expressly excluded.
