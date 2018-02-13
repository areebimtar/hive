exports.up = function(pgm) {
  pgm.sql(`CREATE OR REPLACE FUNCTION deleteCompany(companyId bigint)
    RETURNS void AS
    $$
    BEGIN
    
    DELETE FROM users WHERE company_id = companyId;
    DELETE FROM companies WHERE id = companyId;
    
    END;
    $$
    LANGUAGE 'plpgsql' VOLATILE;
  `);
};

exports.down = function(pgm) {
  pgm.sql('DROP FUNCTION deleteCompany(companyId bigint)');
};