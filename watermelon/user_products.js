import { Model, appSchema, tableSchema, Q } from '@nozbe/watermelondb';
import { field, date, readonly, lazy, immutableRelation } from '@nozbe/watermelondb/decorators';

class UserModel extends Model {
    static table = 'users';
    @field('full_name') full_name;
    @field('email') email;
    @field('phone') phone;
    @field('created_at') created_at;

    @readonly @date('created_at') createdAt
    @readonly @date('updated_at') updatedAt
}

const userSchema = tableSchema({
    name: UserModel.table,
    columns: [
        { name: 'full_name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'phone', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
    ],
});


class ProductModel extends Model {
    static table = 'products';

    @field('title') title;
    @field('description') description;
    @field('amount') amount;
    @field('created_at') created_at;
    @field('updated_at') updated_at;
    @field('original_title') original_title;
    @field('original_amount') original_amount;
}


const productSchema = tableSchema({
    name: ProductModel.table,
    columns: [
        { name: 'title', type: 'string' }
    ]
})


const DbSchema = appSchema({
    version: 1,
    tables: [
        userSchema,
        productSchema,
    ],
});

const DbModels = [UserModel, ProductModel];

export { DbModels, DbSchema, UserModel, ProductModel };


