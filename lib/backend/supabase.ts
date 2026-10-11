import type { SupabaseClient } from '@supabase/supabase-js';

import type { Review, Toilet } from '../types';
import type { Backend } from './types';

type ReviewRow = {
  id: string;
  toilet_id: string;
  user_id: string;
  cleanliness: number;
  safety: number;
  wait: number;
  comment: string;
  created_at: string;
  profiles: { nickname: string } | null;
};

type ToiletRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  fee: boolean | null;
  access: Toilet['access'];
  wheelchair: boolean | null;
  changing_table: boolean | null;
  gender_neutral: boolean | null;
  opening_hours: string | null;
};

const REVIEW_COLUMNS = 'id, toilet_id, user_id, cleanliness, safety, wait, comment, created_at, profiles(nickname)';
const TOILET_COLUMNS =
  'id, name, latitude, longitude, fee, access, wheelchair, changing_table, gender_neutral, opening_hours';
// Keeps the `toilet_id=in.(...)` query string a safe length.
const IDS_PER_REQUEST = 100;
// User toilets get ids like "user-<uuid>" so they never collide with "osm-node-123".
const USER_TOILET_PREFIX = 'user-';

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    toiletId: row.toilet_id,
    userId: row.user_id,
    author: row.profiles?.nickname ?? 'A Peepal',
    cleanliness: row.cleanliness,
    safety: row.safety,
    wait: row.wait,
    comment: row.comment,
    createdAt: Date.parse(row.created_at),
  };
}

function toToilet(row: ToiletRow): Toilet {
  return {
    id: USER_TOILET_PREFIX + row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    fee: row.fee,
    access: row.access,
    wheelchair: row.wheelchair,
    changingTable: row.changing_table,
    genderNeutral: row.gender_neutral,
    openingHours: row.opening_hours,
    source: 'user',
  };
}

export function createSupabaseBackend(supabase: SupabaseClient): Backend {
  return {
    shared: true,

    async signIn() {
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData.session?.user.id;
      if (!userId) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw new Error(`Couldn't sign in: ${error.message}`);
        userId = data.user?.id;
        if (!userId) throw new Error("Couldn't sign in.");
      }
      const { data, error } = await supabase.from('profiles').select('id, nickname').eq('id', userId).single();
      if (error) throw new Error(`Couldn't load your profile: ${error.message}`);
      return data;
    },

    async updateNickname(profile, nickname) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ nickname })
        .eq('id', profile.id)
        .select('id, nickname')
        .single();
      if (error) throw new Error(`Couldn't save your nickname: ${error.message}`);
      return data;
    },

    async fetchReviews(toiletIds) {
      const chunks: string[][] = [];
      for (let i = 0; i < toiletIds.length; i += IDS_PER_REQUEST) {
        chunks.push(toiletIds.slice(i, i + IDS_PER_REQUEST));
      }
      const results = await Promise.all(
        chunks.map((ids) =>
          supabase
            .from('reviews')
            .select(REVIEW_COLUMNS)
            .in('toilet_id', ids)
            .order('created_at', { ascending: false })
            .returns<ReviewRow[]>()
        )
      );
      return results.flatMap(({ data, error }) => {
        if (error) throw new Error(`Couldn't load reviews: ${error.message}`);
        return data.map(toReview);
      });
    },

    async saveReview(profile, review) {
      const { data, error } = await supabase
        .from('reviews')
        .upsert(
          {
            toilet_id: review.toiletId,
            user_id: profile.id,
            cleanliness: review.cleanliness,
            safety: review.safety,
            wait: review.wait,
            comment: review.comment,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'toilet_id,user_id' }
        )
        .select(REVIEW_COLUMNS)
        .returns<ReviewRow[]>()
        .single();
      if (error) throw new Error(`Couldn't post your review: ${error.message}`);
      return toReview(data);
    },

    async fetchUserToilets(center, radiusMeters) {
      // Bounding box is close enough at city scale; switch to PostGIS when needed.
      const dLat = radiusMeters / 111_320;
      const dLon = radiusMeters / (111_320 * Math.cos((center.latitude * Math.PI) / 180));
      const { data, error } = await supabase
        .from('user_toilets')
        .select(TOILET_COLUMNS)
        .gte('latitude', center.latitude - dLat)
        .lte('latitude', center.latitude + dLat)
        .gte('longitude', center.longitude - dLon)
        .lte('longitude', center.longitude + dLon)
        .returns<ToiletRow[]>();
      if (error) throw new Error(`Couldn't load added toilets: ${error.message}`);
      return data.map(toToilet);
    },

    async addToilet(profile, toilet) {
      const { data, error } = await supabase
        .from('user_toilets')
        .insert({
          created_by: profile.id,
          name: toilet.name,
          latitude: toilet.latitude,
          longitude: toilet.longitude,
          fee: toilet.fee,
          access: toilet.access,
          wheelchair: toilet.wheelchair,
          changing_table: toilet.changingTable,
          gender_neutral: toilet.genderNeutral,
          opening_hours: toilet.openingHours,
        })
        .select(TOILET_COLUMNS)
        .returns<ToiletRow[]>()
        .single();
      if (error) throw new Error(`Couldn't add the toilet: ${error.message}`);
      return toToilet(data);
    },
  };
}
