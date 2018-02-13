exports.up = function(pgm) {
  pgm.sql(`CREATE OR REPLACE FUNCTION deleteCompany(companyId bigint)
    RETURNS void AS
    $$
    DECLARE
      shopId bigint;
    BEGIN

      -- Remove all associated shops by successively calling deleteshop
      FOR shopId IN SELECT DISTINCT shop.id FROM accounts acc INNER JOIN shops shop ON (acc.id=shop.account_id) WHERE acc.company_id = companyid LOOP
        perform deleteshop(shopId);
      END LOOP;

      DELETE FROM accounts WHERE company_id = companyId;

    END;
    $$
    LANGUAGE 'plpgsql' VOLATILE;
  `);
};

exports.down = function(pgm) {
  pgm.sql('DROP FUNCTION deleteCompany(companyId bigint)');
};
