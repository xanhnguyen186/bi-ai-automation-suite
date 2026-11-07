WITH p AS (
  SELECT COALESCE(NULLIF('{{ $json.as_of_date }}', '')::date,
                  (SELECT MAX(NULLIF(order_purchase_timestamp::text, '')::timestamp)::date FROM orders)) AS d
),
o AS (
  SELECT order_id, customer_id, order_status,
         NULLIF(order_purchase_timestamp::text, '')::timestamp AS purchased_at,
         NULLIF(order_approved_at::text, '')::timestamp AS approved_at,
         NULLIF(order_delivered_carrier_date::text, '')::timestamp AS carrier_at,
         NULLIF(order_delivered_customer_date::text, '')::timestamp AS delivered_at,
         NULLIF(order_estimated_delivery_date::text, '')::timestamp AS estimated_at
  FROM orders
),
lim AS (
  SELECT order_id,
         MAX(NULLIF(shipping_limit_date::text, '')::timestamp) AS limit_at,
         ROUND(SUM(NULLIF(price::text, '')::numeric), 2) AS value,
         MIN(seller_id) AS seller_id
  FROM order_items GROUP BY order_id
),
base AS (
  SELECT o.*, lim.limit_at, lim.value, lim.seller_id, c.customer_state AS state, p.d
  FROM o
  JOIN lim ON lim.order_id = o.order_id
  JOIN customers c ON c.customer_id = o.customer_id
  CROSS JOIN p
  WHERE o.order_status NOT IN ('canceled', 'unavailable')
    AND o.purchased_at >= p.d - 90 AND o.purchased_at < p.d + 1      -- placed in the last 90 days, up to the chosen date
)
SELECT order_id, state, seller_id, value, 'SELLER_HANDOVER_OVERDUE' AS exception_type,
       (d - limit_at::date) AS days_overdue, to_char(d, 'YYYY-MM-DD') AS as_of_date
FROM base
WHERE approved_at IS NOT NULL AND approved_at < d + 1               -- approved by the chosen date
  AND (carrier_at IS NULL OR carrier_at >= d + 1)                   -- not yet handed to the courier
  AND limit_at::date < d                                            -- seller deadline already passed
UNION ALL
SELECT order_id, state, seller_id, value, 'DELIVERY_OVERDUE',
       (d - estimated_at::date), to_char(d, 'YYYY-MM-DD')
FROM base
WHERE carrier_at IS NOT NULL AND carrier_at < d + 1                 -- with the courier
  AND (delivered_at IS NULL OR delivered_at >= d + 1)               -- not yet delivered
  AND estimated_at::date < d                                        -- estimated date already passed
ORDER BY days_overdue DESC, value DESC;
