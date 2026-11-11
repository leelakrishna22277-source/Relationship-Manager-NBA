import { prisma } from '../config/db.js';

export const productService = {
  /**
   * Retrieves all banking products sorted alphabetically with normalized numbers.
   */
  async getProducts() {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      risk_rating: p.risk_rating,
      min_investment: p.min_investment ? Number(p.min_investment) : null,
      expected_return_bps: p.expected_return_bps,
      created_at: p.created_at.toISOString(),
    }));
  },

  /**
   * Retrieves single product details by ID. Throws 404 if not found.
   */
  async getProductById(id) {
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      const error = new Error('Product not found.');
      error.statusCode = 404;
      error.code = 'PRODUCT_NOT_FOUND';
      throw error;
    }

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      risk_rating: product.risk_rating,
      min_investment: product.min_investment ? Number(product.min_investment) : null,
      expected_return_bps: product.expected_return_bps,
      created_at: product.created_at.toISOString(),
    };
  },
};

