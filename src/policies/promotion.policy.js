function isPromotionActive(promotion, now = new Date()) {
  if (!promotion) return false;
  if (promotion.status !== 'ACTIVE') return false;

  const starts = promotion.startsAt ? new Date(promotion.startsAt) : null;
  const ends = promotion.endsAt ? new Date(promotion.endsAt) : null;

  if (starts && now < starts) return false;
  if (ends && now > ends) return false;

  return true;
}

module.exports = { isPromotionActive };
