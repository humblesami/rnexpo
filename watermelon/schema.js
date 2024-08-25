import { Model, appSchema, tableSchema, Q } from '@nozbe/watermelondb';
import { field, date, readonly, lazy, immutableRelation } from '@nozbe/watermelondb/decorators';

class CategoryModel extends Model {
    static table = 'categories';

    @field('title') title;
    @field('description') description;
    @field('parent_id') parent_id;

    @field('created_at') created_at;
    @field('updated_at') updated_at;

    static associations = {
        trans_cats: { type: 'has_many', foreignKey: 'category_id' },
    };
    @lazy
    transactions = this.collections.get('transactions').query(Q.on('trans_cats', 'category_id', this.id));

    total_amount = 0;
    transaction_list = [];

    @readonly @date('created_at') createdAt
    @readonly @date('updated_at') updatedAt
}

const categorySchema = tableSchema({
    name: CategoryModel.table,
    columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'parent_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
    ],

    associations: [
        { name: 'parent', type: 'belongs_to', foreignKey: 'parent_id' },
        { name: 'trans_cats', type: 'has_many', foreignKey: 'category_id' },
    ],
});


class TransactionModel extends Model {
    static table = 'transactions';

    @field('title') title;
    @field('description') description;
    @field('amount') amount;
    @field('date_time') date_time;
    @field('created_at') created_at;
    @field('updated_at') updated_at;

    static associations = {
        trans_cats: { type: 'has_many', foreignKey: 'transaction_id' },
    };
    @lazy
    categories = this.collections.get('categories').query(Q.on('trans_cats', 'transaction_id', this.id));

    related_categories = [];

    @readonly @date('created_at') createdAt
    @readonly @date('updated_at') updatedAt
}

const transactionSchema = tableSchema({
    name: TransactionModel.table,
    columns: [
        { name: 'title', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'date_time', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
    ],

    associations: [
        { name: 'trans_cats', type: 'has_many', foreignKey: 'transaction_id' },
    ],
});


class TransCatModel extends Model {
    static table = 'trans_cats';

    @field('transaction_id') transaction_id;
    @field('category_id') category_id;
    @field('created_at') created_at;
    @field('updated_at') updated_at;

    static associations = {
        categories: { type: 'belongs_to', key: 'category_id' },
        transactions: { type: 'belongs_to', key: 'transaction_id' },
    }

    @immutableRelation('categories', 'category_id') category
    @immutableRelation('transactions', 'transaction_id') transaction

    @readonly @date('created_at') createdAt
    @readonly @date('updated_at') updatedAt
}

const categoryTransactionSchema = tableSchema({
    name: TransCatModel.table,
    columns: [
        { name: 'category_id', type: 'string' },
        { name: 'transaction_id', type: 'string' },
        { name: 'created_at', type: 'number' },
    ],

    associations: [
        { name: 'categories', type: 'belongs_to', foreignKey: 'category_id' },
        { name: 'transactions', type: 'belongs_to', foreignKey: 'transaction_id' },
    ],
});

const DbSchema = appSchema({
    version: 2,
    tables: [
        categorySchema,
        transactionSchema,
        categoryTransactionSchema,
    ],
});

const DbModels = [CategoryModel, TransactionModel, TransCatModel];

export { DbModels, DbSchema, CategoryModel, TransactionModel, TransCatModel };
