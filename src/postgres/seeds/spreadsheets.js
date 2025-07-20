/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function seed(knex) {
    await knex("spreadsheets")
        .insert([{ spreadsheet_id: "1iJxLzkQzD5HksfzNaFOHzY3hQDHxOSolmH31euhYFqE" }])
        .onConflict(["spreadsheet_id"])
        .ignore();
}
