import { getSupabaseClient } from '../client';
import { mapProductFromDb, mapSaleFromDb } from '../mappers';
import type { Product, Sale } from '../../../types/index';

export const posService = {
  async fetchProducts(branchId: string): Promise<Product[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.warn('[posService] fetchProducts notice:', error.message);
        return [];
      }

      return (data || []).map(mapProductFromDb);
    } catch {
      return [];
    }
  },

  async upsertProduct(product: Product): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from('products')
        .upsert({
          id: product.id,
          account_id: product.accountId || product.tenantId,
          business_id: product.businessId,
          branch_id: product.branchId || product.facilityId,
          staff_id: product.staffId || null,
          name: product.name,
          description: product.description || null,
          price: product.price.amount,
          cost: product.cost.amount,
          stock_quantity: product.stockQuantity,
          sku: product.sku || null,
          category: product.category,
          image_url: product.imageUrl || null,
          reorder_level: product.reorderLevel,
          is_active: product.isActive,
        });

      if (error) {
        console.warn('[posService] upsertProduct notice:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async fetchSales(branchId: string): Promise<Sale[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('sales')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[posService] fetchSales notice:', error.message);
        return [];
      }

      return (data || []).map(mapSaleFromDb);
    } catch {
      return [];
    }
  },

  async createSale(sale: Sale): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from('sales')
        .insert({
          id: sale.id,
          account_id: sale.accountId || sale.tenantId,
          business_id: sale.businessId,
          branch_id: sale.branchId || sale.facilityId,
          staff_id: sale.staffId || null,
          member_id: sale.memberId || null,
          member_name: sale.memberName || null,
          total_amount: sale.totalAmount,
          payment_method: sale.paymentMethod,
          items: sale.items as any,
          notes: sale.notes || null,
        });

      if (error) {
        console.warn('[posService] createSale notice:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },
};
