import type { SupabaseClient } from '@supabase/supabase-js';
import { File } from 'expo-file-system';

import type { Photo, Profile, Review, Toilet } from '../types';
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

type PhotoRow = {
  id: string;
  toilet_id: string;
  user_id: string;
  path: string;
  created_at: string;
};

const REVIEW_COLUMNS = 'id, toilet_id, user_id, cleanliness, safety, wait, comment, created_at, profiles(nickname)';
const TOILET_COLUMNS =
  'id, name, latitude, longitude, fee, access, wheelchair, changing_table, gender_neutral, opening_hours';
// Keeps the `toilet_id=in.(...)` query string a safe length.
const IDS_PER_REQUEST = 100;
// User toilets get ids like "user-<uuid>" so they never collide with "osm-node-123".
const USER_TOILET_PREFIX = 'user-';
const PHOTO_BUCKET = 'toilet-photos';
const PHOTO_COLUMNS = 'id, toilet_id, user_id, path, created_at';

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
  async function loadProfile(user: { id: string; email?: string }): Promise<Profile> {
    const { data, error } = await supabase.from('profiles').select('id, nickname').eq('id', user.id).single();
    if (error) throw new Error(`Couldn't load your profile: ${error.message}`);
    return { ...data, email: user.email ?? null };
  }

  function toPhoto(row: PhotoRow): Photo {
    return {
      id: row.id,
      toiletId: row.toilet_id,
      userId: row.user_id,
      url: supabase.storage.from(PHOTO_BUCKET).getPublicUrl(row.path).data.publicUrl,
      createdAt: Date.parse(row.created_at),
    };
  }

  return {
    shared: true,

    async getMember() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      // Older app versions signed everyone in anonymously; those sessions count as guests.
      if (!user || user.is_anonymous) return null;
      return loadProfile(user);
    },

    onMemberChange(listener) {
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          // Supabase warns against awaiting its own calls inside this callback.
          setTimeout(listener, 0);
        }
      });
      return () => data.subscription.unsubscribe();
    },

    async sendEmailCode(email) {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw new Error(`Couldn't send the code: ${error.message}`);
    },

    async signIn(method) {
      if (method.kind !== 'email-code') throw new Error('Device profiles are only for offline mode.');
      const { data, error } = await supabase.auth.verifyOtp({ email: method.email, token: method.code, type: 'email' });
      if (error) throw new Error(`That code didn't work: ${error.message}`);
      if (!data.user) throw new Error("Couldn't sign in.");
      return loadProfile(data.user);
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(`Couldn't sign out: ${error.message}`);
    },

    async updateNickname(profile, nickname) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ nickname })
        .eq('id', profile.id)
        .select('id, nickname')
        .single();
      if (error) throw new Error(`Couldn't save your nickname: ${error.message}`);
      return { ...data, email: profile.email };
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

    async fetchPhotos(toiletId) {
      const { data, error } = await supabase
        .from('toilet_photos')
        .select(PHOTO_COLUMNS)
        .eq('toilet_id', toiletId)
        .order('created_at', { ascending: false })
        .limit(30)
        .returns<PhotoRow[]>();
      if (error) throw new Error(`Couldn't load photos: ${error.message}`);
      return data.map(toPhoto);
    },

    async addPhoto(profile, toiletId, picked) {
      const ext = picked.mimeType === 'image/png' ? 'png' : 'jpg';
      // Storage policies only allow uploads into the member's own folder.
      const path = `${profile.id}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const bytes = await new File(picked.uri).arrayBuffer();
      const upload = await supabase.storage.from(PHOTO_BUCKET).upload(path, bytes, { contentType: picked.mimeType });
      if (upload.error) throw new Error(`Couldn't upload the photo: ${upload.error.message}`);

      const { data, error } = await supabase
        .from('toilet_photos')
        .insert({ toilet_id: toiletId, user_id: profile.id, path })
        .select(PHOTO_COLUMNS)
        .returns<PhotoRow[]>()
        .single();
      if (error) throw new Error(`Couldn't save the photo: ${error.message}`);
      return toPhoto(data);
    },
  };
}
