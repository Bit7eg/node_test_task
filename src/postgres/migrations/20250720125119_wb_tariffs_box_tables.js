/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
    // Создаем таблицу для общих данных запроса
    await knex.schema.createTable("wb_tariffs_box_requests", (table) => {
        table.increments("id").primary();
        table.date("request_date").notNullable(); // Дата запроса (когда получили данные)
        table.date("dt_next_box"); // Дата начала следующего тарифа
        table.date("dt_till_max"); // Дата окончания последнего установленного тарифа
        
        table.unique(["request_date"]); // Один запрос в день
    });

    // Создаем таблицу для тарифов по складам
    await knex.schema.createTable("wb_tariffs_box_warehouses", (table) => {
        table.increments("id").primary();
        table.integer("request_id").unsigned().notNullable();
        table.string("warehouse_name", 255).notNullable(); // Название склада
        table.decimal("box_delivery_and_storage_expr", 10, 2); // Коэффициент, на который умножается стоимость доставки и хранения.
        table.decimal("box_delivery_base", 10, 2); // Базовая доставка
        table.decimal("box_delivery_liter", 10, 2); // Доставка за литр
        table.decimal("box_storage_base", 10, 2); // Базовая стоимость хранения
        table.decimal("box_storage_liter", 10, 2); // Хранение за литр
        
        // Внешний ключ на таблицу запросов
        table.foreign("request_id").references("id").inTable("wb_tariffs_box_requests").onDelete("CASCADE");
        
        // Уникальный индекс для предотвращения дублирования
        table.unique(["request_id", "warehouse_name"]);
    });

    return knex.schema;
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
    // Удаляем таблицы в обратном порядке (из-за внешних ключей)
    await knex.schema.dropTableIfExists("wb_tariffs_box_warehouses");
    await knex.schema.dropTableIfExists("wb_tariffs_box_requests");

    return knex.schema;
}
