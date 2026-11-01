import { Dexie, type EntityTable } from 'dexie';
import type {
  Account,
  BudgetItem,
  Category,
  Goal,
  GoalPlan,
  IncomeItem,
  Month,
  Settings,
  Template,
  Transaction,
} from '../domain/types';
import { seedDefaults } from './seed';

export class BudgetaDB extends Dexie {
  settings!: EntityTable<Settings, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  accounts!: EntityTable<Account, 'id'>;
  templates!: EntityTable<Template, 'id'>;
  months!: EntityTable<Month, 'id'>;
  budgetItems!: EntityTable<BudgetItem, 'id'>;
  incomeItems!: EntityTable<IncomeItem, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  goalPlans!: EntityTable<GoalPlan, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;

  constructor(name = 'budgeta') {
    super(name);
    // Only indexed fields are listed; every record stores its full object.
    // Schema changes must add a new version(n) with an upgrade — never edit version 1 in place.
    this.version(1).stores({
      settings: 'id',
      categories: 'id, order',
      accounts: 'id, order',
      templates: 'id, kind, order, categoryId, accountId',
      months: 'id',
      budgetItems: 'id, monthId, templateId, categoryId, accountId',
      incomeItems: 'id, monthId, templateId, accountId',
      goals: 'id, status, order',
      goalPlans: 'id, monthId, goalId, &[monthId+goalId]',
      transactions: 'id, monthId, date, type, budgetItemId, incomeItemId, goalId, categoryId, accountId',
    });
    // Runs once, when the database is first created on this device.
    this.on('populate', (tx) => seedDefaults(tx));
  }
}

export const db = new BudgetaDB();
