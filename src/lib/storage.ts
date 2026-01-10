import axios from 'axios'

/**
 * Upload avatar image to Supabase storage
 * Returns the public URL: https://{{supabase_project_id}}.supabase.co/storage/v1/object/public/avatars/{{avatar_name}}
 */
export async function uploadAvatar(
  file: File,
  accessToken: string
): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  
  if (!supabaseUrl) {
    throw new Error('Supabase URL is not configured')
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`

  // Upload file to storage bucket "avatars"
  // Path format: storage/v1/object/avatars/{{avatar_name}}
  // Use binary body upload with bearer token only (no Content-Type header)
  await axios.post(
    `${supabaseUrl}/storage/v1/object/avatars/${fileName}`,
    file,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  // Return the URL format as specified: https://{{supabase_project_id}}.supabase.co/storage/v1/object/public/avatars/{{avatar_name}}
  return `${supabaseUrl}/storage/v1/object/public/avatars/${fileName}`
}

