import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { PhotoCapture, SpatialLocation } from '@/types';

export class PhotoCaptureService {
  static async requestPermissions(): Promise<boolean> {
    try {
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        console.log('Camera permission denied');
        return false;
      }

      // Request media library permissions
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaPermission.status !== 'granted') {
        console.log('Media library permission denied');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting photo permissions:', error);
      return false;
    }
  }

  static async capturePhoto(annotations?: string): Promise<PhotoCapture | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Camera permissions not granted');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      
      // Get current location
      let location: SpatialLocation | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const locationResult = await Location.getCurrentPositionAsync({});
          location = {
            latitude: locationResult.coords.latitude,
            longitude: locationResult.coords.longitude,
            elevation: locationResult.coords.altitude || 0,
            utm_x: 0, // Would be calculated from lat/lon
            utm_y: 0, // Would be calculated from lat/lon
            mine_grid_x: 0, // Would be calculated from lat/lon
            mine_grid_y: 0, // Would be calculated from lat/lon
          };
        }
      } catch (locationError) {
        console.error('Error getting location for photo:', locationError);
      }

      const photoCapture: PhotoCapture = {
        id: `photo_${Date.now()}`,
        uri: asset.uri,
        timestamp: new Date().toISOString(),
        location,
        annotations,
      };

      return photoCapture;
    } catch (error) {
      console.error('Error capturing photo:', error);
      throw error;
    }
  }

  static async selectFromGallery(annotations?: string): Promise<PhotoCapture | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Media library permissions not granted');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];

      const photoCapture: PhotoCapture = {
        id: `photo_${Date.now()}`,
        uri: asset.uri,
        timestamp: new Date().toISOString(),
        annotations,
      };

      return photoCapture;
    } catch (error) {
      console.error('Error selecting photo from gallery:', error);
      throw error;
    }
  }

  static async uploadPhoto(photo: PhotoCapture): Promise<string> {
    try {
      const formData = new FormData();
      
      // Create file object for upload
      const fileUri = photo.uri;
      const filename = `photo_${photo.id}.jpg`;
      
      formData.append('photo', {
        uri: fileUri,
        type: 'image/jpeg',
        name: filename,
      } as any);

      formData.append('metadata', JSON.stringify({
        id: photo.id,
        timestamp: photo.timestamp,
        location: photo.location,
        annotations: photo.annotations,
      }));

      const response = await fetch('http://localhost:3000/api/photos/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.url; // Return the uploaded photo URL
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  }

  static async compressPhoto(uri: string, quality: number = 0.7): Promise<string> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return uri; // Return original if compression fails
      }

      return result.assets[0].uri;
    } catch (error) {
      console.error('Error compressing photo:', error);
      return uri; // Return original if compression fails
    }
  }

  static async deleteLocalPhoto(uri: string): Promise<void> {
    try {
      // In a real implementation, you might want to delete the local file
      // For now, we'll just log it
      console.log('Deleting local photo:', uri);
    } catch (error) {
      console.error('Error deleting local photo:', error);
    }
  }

  static getPhotoPreviewUri(photo: PhotoCapture): string {
    return photo.uri;
  }

  static formatPhotoMetadata(photo: PhotoCapture): string {
    const metadata = [];
    
    if (photo.timestamp) {
      metadata.push(`Captured: ${new Date(photo.timestamp).toLocaleString()}`);
    }
    
    if (photo.location) {
      metadata.push(`Location: ${photo.location.latitude.toFixed(6)}, ${photo.location.longitude.toFixed(6)}`);
    }
    
    if (photo.annotations) {
      metadata.push(`Notes: ${photo.annotations}`);
    }
    
    return metadata.join('\n');
  }
}