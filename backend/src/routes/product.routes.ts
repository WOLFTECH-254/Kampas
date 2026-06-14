
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getProducts, getProduct, searchProducts, getTrending, getRecommended, getInterests, getSearchSuggestions, reportProduct } from '../controllers/product.controller.js';

const r = Router();

r.get('/', getProducts);
r.get('/search', searchProducts);
r.get('/search/suggestions', getSearchSuggestions);
r.get('/trending', getTrending);
r.get('/recommended', authenticate, getRecommended);
r.get('/interests',   authenticate, getInterests);
r.get('/:id', getProduct);
r.post('/:id/report', authenticate, reportProduct);

export default r;
