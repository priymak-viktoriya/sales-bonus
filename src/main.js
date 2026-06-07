/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // @TODO: Расчет выручки от операции
    const { sale_price, quantity, discount } = purchase;
    const discountDecimal = discount / 100;
    const revenue = sale_price * quantity * (1 - discountDecimal);
    return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    const { profit } = seller;
    let bonusPercent;

    if (index === 0) {
        // Первое место — 15%
        bonusPercent = 15;
    } else if (index === 1 || index === 2) {
        // Второе и третье место — 10%
        bonusPercent = 10;
    } else if (index === total - 1) {
        // Последнее место — 0%
        bonusPercent = 0;
    } else {
        // Все остальные — 5%
        bonusPercent = 5;
    }

    // Бонус = прибыль * процент / 100
    const bonus = profit * bonusPercent / 100;

    // Округляем до целого числа (можно оставить и дробным, но в ТЗ пример целый)
    return Math.round(bonus);
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid data: data must be an object');
    }

    if (!data.sellers || !Array.isArray(data.sellers) ||
        !data.products || !Array.isArray(data.products) ||
        !data.purchase_records || !Array.isArray(data.purchase_records)) {
        throw new Error('Invalid data structure: missing required collections');
    }


    // @TODO: Проверка наличия опций
    if (!options || typeof options !== 'object') {
        throw new Error('Invalid options: options must be an object');
    }

    const calculateRevenue = options.calculateRevenue;
    const calculateBonus = options.calculateBonus;

    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Invalid options: missing required callback functions');
    }
    // @TODO: Подготовка промежуточных данных для сбора статистики

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(
        data.sellers.map(seller => [seller.id, seller]));


    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product]));


    // Подготовка промежуточных данных для сбора статистики
    const sellerStats = new Map(); // key: seller_id, value: { revenue, profit, sales_count, productsSales }
    for (const seller of data.sellers) {
        sellerStats.set(seller.id, {
            revenue: 0,
            profit: 0,
            sales_count: 0,
            productsSales: new Map() // key: sku, value: quantity
        });
    }
    // @TODO: Расчет выручки и прибыли для каждого продавца
    for (const record of data.purchase_records) {
        const sellerId = record.seller_id;

        const stats = sellerStats.get(sellerId);
        if (!stats) {
            console.warn(`Seller with id ${sellerId} not found`);
            continue;
        }

        stats.sales_count++;

        for (const item of record.items) {
            const product = productIndex[item.sku];
            if (!product) {
                console.warn(`Product with sku ${item.sku} not found`);
                continue;
            }

            // Выручка через переданную функцию
            const revenue = calculateRevenue(item, product);
            stats.revenue += revenue;

            // Закупочная стоимость
            const purchaseCost = product.purchase_price * item.quantity;
            stats.profit += revenue - purchaseCost;

            // Учет количества проданных товаров для топ-10
            const currentQuantity = stats.productsSales.get(item.sku) || 0;
            stats.productsSales.set(item.sku, currentQuantity + item.quantity);
        }
    }

    // @TODO: Сортировка продавцов по прибыли
    const sortedSellers = Array.from(sellerStats.entries())
        .map(([sellerId, stats]) => ({
            sellerId,
            stats
        }))
        .sort((a, b) => b.stats.profit - a.stats.profit);

    // @TODO: Назначение премий на основе ранжирования
    const totalSellers = sortedSellers.length;
    for (let i = 0; i < totalSellers; i++) {
        const seller = sortedSellers[i];
        const sellerForBonus = { profit: seller.stats.profit };
        const bonus = calculateBonus(i, totalSellers, sellerForBonus);
        seller.bonus = bonus;
    }

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sortedSellers.map(seller => {
        const sellerInfo = sellerIndex[seller.sellerId];
        const stats = seller.stats;

        // Топ-10 товаров по количеству продаж
        const topProducts = Array.from(stats.productsSales.entries())
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        return {
            seller_id: seller.sellerId,
            name: `${sellerInfo.first_name} ${sellerInfo.last_name}`,
            revenue: +stats.revenue.toFixed(2),      // число с двумя знаками
            profit: +stats.profit.toFixed(2),        // число с двумя знаками
            sales_count: stats.sales_count,
            top_products: topProducts,
            bonus: +seller.bonus.toFixed(2)          // число с двумя знаками
        };
    });
}





