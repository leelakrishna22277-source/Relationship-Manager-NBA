import { productService } from '../services/product.service.js';

export async function getProducts(req, res, next) {
  try {
    const data = await productService.getProducts();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const data = await productService.getProductById(id);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}
