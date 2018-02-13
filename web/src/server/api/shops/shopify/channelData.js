async function getProductTypes(models, shopId) {
  const productTypes = await models.shopifyProducts.getProductTypes(shopId);
  return productTypes.sort();
}

async function getVendors(models, shopId) {
  const vendors = await models.shopifyProducts.getVendors(shopId);
  return vendors.sort();
}

export default async (config, models, rabbitClient, req, res) => {
  const { shopId } = req.params;

  try {
    const vendors = await getVendors(models, shopId);
    const productTypes = await getProductTypes(models, shopId);
    res.json({ productTypes, vendors });
  } catch (error) {
    res.json({error: error.message});
  }
};
