import ShippingSetting from '../models/shippingSetting.model.js';

export class ShippingSettingService {
  /**
   * Get shipping settings or create default if none exist
   */
  static async getShippingSettings() {
    let shippingSettings = await ShippingSetting.findOne({ singleton: 'GLOBAL' });

    if (!shippingSettings) {
      shippingSettings = await this.createDefaultSettings();
    }

    return shippingSettings;
  }

  /**
   * Create default shipping settings
   */
  static async createDefaultSettings() {
    return await ShippingSetting.create({
      singleton: 'GLOBAL',
      baseCharge: 80,
      freeAbove: 2999,
      active: true,
      inclusiveGST: true
    });
  }

  /**
   * Update shipping settings
   */
  static async updateShippingSettings(updateData) {
    const settings = await ShippingSetting.findOneAndUpdate(
      { singleton: 'GLOBAL' },
      { ...updateData, lastUpdated: new Date() },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    return settings;
  }

  /**
   * Calculate shipping charge for given cart total
   */
  static async calculateShippingCharge(cartTotal) {
    const settings = await this.getShippingSettings();

    if (!settings.active) {
      return 0;
    }

    if (cartTotal >= settings.freeAbove) {
      return 0;
    }

    return settings.baseCharge;
  }

  /**
   * Reset shipping settings to default values
   */
  static async resetToDefault() {
    const defaultSettings = {
      singleton: 'GLOBAL',
      baseCharge: 80,
      freeAbove: 2999,
      active: true,
      inclusiveGST: true,
      lastUpdated: new Date()
    };

    return await ShippingSetting.findOneAndUpdate(
      { singleton: 'GLOBAL' },
      defaultSettings,
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );
  }

  /**
   * Check if free shipping applies for given cart total
   */
  static async isFreeShippingApplicable(cartTotal) {
    const settings = await this.getShippingSettings();
    return settings.active && cartTotal >= settings.freeAbove;
  }
}
