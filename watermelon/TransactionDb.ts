import { database } from "./adapter";
import { Model, Q } from '@nozbe/watermelondb';
import { TransCatModel, CategoryModel, TransactionModel } from "./schema";
import { Clause } from "@nozbe/watermelondb/QueryDescription";
// import { PaginationType } from "../types";
class PaginationType{
    offset = 0;
    per_page= 10;
    record_count = 0;
}

type CategoryType = { id: string, title: string };
type ItemType = Record<string, any>;
type TransactionType = {
    id: string, title: string,
    amount: number, created_at: number,
    related_categories: CategoryType[],
    changed_fields: ItemType
}
type ChildType = { table: string, relation_key: string };
type ChildDataType = { table: string, relation_key: string, data: ItemType[] };
type ApiResult = { status: number, error: string, data: any };
type CatType = { id: string, title: string, transactions: TransactionModel[], total_amount: number }

const TransactionDb = {

    initApiResult: function (): ApiResult {
        let result: ApiResult = { status: 0, error: 'Uknown', data: {} };
        return result;
    },

    makeInsertRow: function (itemData: ItemType): ItemType {
        let changeData: ItemType = {};
        for (let key in itemData) {
            let readOnly = ['id', 'created_at', 'changed_fields'];
            if (!Array.isArray(itemData[key]) && readOnly.indexOf(key) == -1) {
                changeData[key] = itemData[key];
            }
        }
        return changeData;
    },

    searchCategories: async function (cat_params: Clause[] = [], page_data: PaginationType) {
        let cat_list = await this.getModelData<any>(CategoryModel.table, cat_params);
        let full_cat_list = cat_list.reduce((acc, cat_item) => {
            let cat = {
                id: cat_item.id,
                title: cat_item.title,
            };
            acc.push(cat);
            return acc;
        }, []);

        full_cat_list.sort((a: any, b: any) => b.total_amount - a.total_amount);
        let final_cat_list = full_cat_list.slice(page_data.offset, page_data.offset + page_data.per_page);
        return final_cat_list;
    },

    searchCategoriesWithTransactions: async function (trans_params: Clause[] = [], page_data: PaginationType) {        
        let trans_list = await this.getModelData<any>(TransactionModel.table, trans_params);
        const trans_dict = trans_list.reduce((acc, item) => {            
            acc[item.id] = {id: item.id, amount: item.amount, created_at: item.created_at};
            return acc;
        }, {});

        let tarns_cat_params = [Q.where('transaction_id', Q.oneOf(Object.keys(trans_dict)))];
        const trans_cats = await this.getModelData<any>(TransCatModel.table, tarns_cat_params);
        let cat_trans_dict = trans_cats.reduce((acc, item) => {
            if (!acc[item.category_id]) {
                acc[item.category_id] = { list: [], amount: 0 };
            }
            acc[item.category_id].list.push(trans_dict[item.transaction_id]);
            acc[item.category_id].amount += trans_dict[item.transaction_id].amount;
            return acc;
        }, {});

        
        let all_cats_list = await this.getModelData<any>(CategoryModel.table, []);
        page_data.record_count = all_cats_list.length;
        let full_cat_list = all_cats_list.reduce((acc, cat_item) => {
            if(!cat_trans_dict[cat_item.id]){
                cat_trans_dict[cat_item.id] = {amount: 0, list: []}
            }
            let cat = {
                id: cat_item.id,
                title: cat_item.title,
                total_amount: cat_trans_dict[cat_item.id].amount,
                transaction_list: cat_trans_dict[cat_item.id].list,
            };
            acc.push(cat);
            return acc;
        }, []);

        full_cat_list.sort((a: any, b: any) => b.total_amount - a.total_amount);
        let final_cat_list = full_cat_list.slice(page_data.offset, page_data.offset + page_data.per_page);
        return final_cat_list;
    },

    getTransactions: async function (params: Clause[] = [], page_data?: PaginationType) {
        try {
            const transactions = await this.getModelData<TransactionModel>('transactions', params, page_data);
            const mappedData = await Promise.all(transactions.map(async (mainItem) => {
                let transaction = mainItem as TransactionModel;
                const transCats = await transaction.categories.fetch();
                const relatedCategories = await Promise.all(transCats.map(async (subItem) => {
                    let category = subItem as CategoryModel;
                    return { id: category.id, title: category.title };
                }));

                return {
                    id: transaction.id,
                    title: transaction.title,
                    amount: transaction.amount,
                    created_at: transaction.created_at,
                    related_categories: relatedCategories,
                    changed_fields: {},
                };
            }));

            return mappedData;
        } catch (error) {
            console.error('Error in getting transactions:', error);
            return [];
        }
    },

    getModel: async function <T extends Model>(collectionName: string, params: Clause[]): Promise<T[]> {
        return await database.get(collectionName).query(params).fetch() as T[];
    },

    getModelData: async function <T extends Model>(table_name: string, params: Clause[] = [], page_data?: PaginationType): Promise<T[]> {
        var dataRows: T[] = [];
        try {
            if (page_data) {
                page_data.record_count = await database.get(table_name).query(params).fetchCount();
                if (page_data.offset) {
                    params.push(Q.skip(page_data.offset));
                }
                if (page_data.per_page) {
                    params.push(Q.take(page_data.per_page));
                }
            }
            let res = await database.get(table_name).query(params).fetch();
            dataRows = res as T[];
        }
        catch (err) {
            let message = 'Error in get model ' + table_name + ' => ' + err;
            console.log(message);
        }
        return dataRows;
    },

    deleteRecords: async function (matched_rows: Model[] = []) {
        if (matched_rows.length) {
            await database.write(async () => {
                const deleted = matched_rows.map(child_item => child_item.prepareDestroyPermanently());
                database.batch(...deleted);
            });
        }
    },

    createWithChildren: async function (
        table_name: string,
        itemData: ItemType,
        children: { table: string; relation_key: string; data: ItemType[] }[] = [],
    ) {
        let obj_it = this;
        let result = this.initApiResult();
        let createdItem: Model | undefined;

        try {
            let changeData = obj_it.makeInsertRow(itemData);

            await database.write(async () => {
                createdItem = await database.get(table_name).create((dbRecord1: ItemType) => {
                    Object.keys(changeData).map(key => dbRecord1[key] = changeData[key]);
                });
                await obj_it.createChildren(children, createdItem.id);
            });

            if (createdItem) {
                itemData.id = createdItem.id;
                result = { status: 1, error: '', data: itemData };
            } else {
                throw new Error('Failed to create the parent record.');
            }
        } catch (err) {
            let message = 'Error in create record => ' + table_name + ' => ' + err;
            console.log(18881, itemData, message);
            result.error = message;
        }

        return result;
    },

    createChildren: async function (children: ChildDataType[], parent_id: string) {
        let child_rows: { table: string, row_data: ItemType }[] = [];
        for (let child_data of children) {
            for (let child_row of child_data.data) {
                child_row[child_data.relation_key] = parent_id;
                child_rows.push({ table: child_data.table, row_data: child_row });
            }
        }

        let created_children = [];
        for (let item of child_rows) {
            let subItem = await database.get(item.table).create((dbRecord2: ItemType) => {
                Object.keys(item.row_data).map(key => dbRecord2[key] = item.row_data[key]);
            });
            created_children.push(subItem);
        }
        if (created_children.length) {
            //console.log('Created subItem', created_children);
        }
        return created_children;
    },

    deleteRecordById: async function (table_name: string, itemId: string) {
        let result = this.initApiResult();
        let obj_it = this;
        try {
            console.log('deleting', table_name, itemId);
            let del_list: Model[] = [];
            const recordToChange = await database.get(table_name).find(itemId);
            del_list.push(recordToChange);
            obj_it.deleteRecords(del_list);
            result = { status: 1, error: '', data: itemId };
        }
        catch (err) {
            let message = 'Error in delete ' + table_name + ' => ' + err;
            console.log(18881, message, itemId);
            result.error = message;
            throw err;
        }
        return result;
    },

    deleteRecordWithChildren: async function (table_name: string, itemData: ItemType, children: ChildType[] = []) {
        let result = this.initApiResult();
        let obj_it = this;
        try {
            console.log('deleting', table_name, itemData, children);
            let del_list: Model[] = [];
            for (let item of children) {
                let found_objects = await database.get(item.table).query([]).fetch();
                del_list = del_list.concat(found_objects);
            }
            const recordToChange = await database.get(table_name).find(itemData.id);
            del_list.push(recordToChange);
            obj_it.deleteRecords(del_list);
            result = { status: 1, error: '', data: itemData };
        }
        catch (err) {
            let message = 'Error in delete ' + table_name + ' => ' + err;
            console.log(18881, message, itemData);
            result.error = message;
            throw err;
        }
        return result;
    },

    updateRecord: async function (table_name: string, itemData: ItemType, children: ChildDataType[] = []) {
        let result = this.initApiResult();
        let obj_it = this;
        let changeData: ItemType = {};
        try {
            for (let key in itemData) {
                if (!Array.isArray(itemData[key]) && itemData.changed_fields[key]) {
                    changeData[key] = itemData[key];
                }
            }
            //console.log('Updating ' + table_name, changeData, itemData.changed_fields, children);
            if (!Object.keys(itemData.changed_fields).length) {
                result.error = 'No fields changed';
                return result;
            }

            let matched_rows: Model[] = [];
            for (let item of children) {
                let found_objects = await obj_it.getModelData(item.table, [Q.where(item.relation_key, itemData.id)]);
                matched_rows = matched_rows.concat(found_objects);
            }

            await database.write(async () => {
                if (Object.keys(changeData).length) {
                    const recordToChange = await database.get(table_name).find(itemData.id);
                    await recordToChange.update(() => {
                        Object.keys(changeData).map(key => (recordToChange as ItemType)[key] = changeData[key]);
                    })
                }
                obj_it.deleteRecords(matched_rows);
                if (children.length) {
                    await obj_it.createChildren(children, itemData.id);
                }
            });
            result = { status: 1, error: '', data: changeData };
        }
        catch (err) {
            let message = 'Error in modify => ' + table_name + ' => ' + err;
            console.log(18881, message, itemData);
            result.error = message;
        }
        return result;
    },

    addChildren: function (children: ChildDataType[], new_child_data: ChildDataType) {
        children.push({
            data: [],
            table: new_child_data.table,
            relation_key: new_child_data.relation_key,
        })
        let child_index = children.length - 1;
        for (let item of new_child_data.data) {
            children[child_index].data.push({ category_id: item.id });
        }
        return children;
    }
}

export { TransactionDb }
