-- ============================================================
-- Song Steward — funkcje RPC dla statystyk dashboardu (PR 4)
-- Uruchom ręcznie w Supabase Dashboard → SQL Editor
-- ============================================================

-- Najczęściej śpiewane pieśni z filtrami
CREATE OR REPLACE FUNCTION get_top_sung(
  p_location_id       UUID    DEFAULT NULL,
  p_leader_id         UUID    DEFAULT NULL,
  p_months            INT     DEFAULT NULL,
  p_tag_ids_include   UUID[]  DEFAULT '{}',
  p_tag_ids_exclude   UUID[]  DEFAULT '{}',
  p_limit             INT     DEFAULT 5
) RETURNS TABLE (
  id                    UUID,
  collection_short_name TEXT,
  number                INT,
  title                 TEXT,
  author                TEXT,
  original_key          TEXT,
  minor                 BOOLEAN,
  sung_count            BIGINT
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    s.id,
    c.short_name AS collection_short_name,
    s.number,
    s.title,
    s.author,
    s.original_key,
    s.minor,
    COUNT(ss.id)::BIGINT AS sung_count
  FROM songs s
  JOIN collections c ON c.id = s.collection_id
  JOIN service_songs ss ON ss.song_id = s.id AND ss.status = 'sung'
  JOIN services svc    ON svc.id = ss.service_id
  WHERE
    (p_location_id IS NULL OR svc.location_id = p_location_id)
    AND (p_leader_id IS NULL OR svc.worship_leader_id = p_leader_id)
    AND (p_months IS NULL OR svc.date >= (CURRENT_DATE - (p_months || ' months')::INTERVAL)::DATE)
    AND (
      array_length(p_tag_ids_include, 1) IS NULL OR (
        SELECT COUNT(*) FROM song_tags st
        WHERE st.song_id = s.id AND st.tag_id = ANY(p_tag_ids_include)
      ) = array_length(p_tag_ids_include, 1)
    )
    AND (
      array_length(p_tag_ids_exclude, 1) IS NULL OR NOT EXISTS (
        SELECT 1 FROM song_tags st
        WHERE st.song_id = s.id AND st.tag_id = ANY(p_tag_ids_exclude)
      )
    )
  GROUP BY s.id, c.short_name, s.number, s.title, s.author, s.original_key, s.minor
  ORDER BY sung_count DESC
  LIMIT p_limit;
$$;

-- Nigdy nieśpiewane pieśni z filtrami
CREATE OR REPLACE FUNCTION get_never_sung(
  p_location_id       UUID    DEFAULT NULL,
  p_leader_id         UUID    DEFAULT NULL,
  p_months            INT     DEFAULT NULL,
  p_tag_ids_include   UUID[]  DEFAULT '{}',
  p_tag_ids_exclude   UUID[]  DEFAULT '{}',
  p_limit             INT     DEFAULT 5
) RETURNS TABLE (
  id                    UUID,
  collection_short_name TEXT,
  number                INT,
  title                 TEXT,
  author                TEXT,
  original_key          TEXT,
  minor                 BOOLEAN
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    s.id,
    c.short_name AS collection_short_name,
    s.number,
    s.title,
    s.author,
    s.original_key,
    s.minor
  FROM songs s
  JOIN collections c ON c.id = s.collection_id
  WHERE
    NOT EXISTS (
      SELECT 1
      FROM service_songs ss
      JOIN services svc ON svc.id = ss.service_id
      WHERE ss.song_id = s.id
        AND ss.status = 'sung'
        AND (p_location_id IS NULL OR svc.location_id = p_location_id)
        AND (p_leader_id IS NULL OR svc.worship_leader_id = p_leader_id)
        AND (p_months IS NULL OR svc.date >= (CURRENT_DATE - (p_months || ' months')::INTERVAL)::DATE)
    )
    AND (
      array_length(p_tag_ids_include, 1) IS NULL OR (
        SELECT COUNT(*) FROM song_tags st
        WHERE st.song_id = s.id AND st.tag_id = ANY(p_tag_ids_include)
      ) = array_length(p_tag_ids_include, 1)
    )
    AND (
      array_length(p_tag_ids_exclude, 1) IS NULL OR NOT EXISTS (
        SELECT 1 FROM song_tags st
        WHERE st.song_id = s.id AND st.tag_id = ANY(p_tag_ids_exclude)
      )
    )
  ORDER BY c.short_name, s.number
  LIMIT p_limit;
$$;
