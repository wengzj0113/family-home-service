/**
 * Geolocation utility for Browser/App
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理定位'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        let msg = '无法获取位置信息';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = '用户拒绝了地理定位请求';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = '位置信息不可用';
            break;
          case error.TIMEOUT:
            msg = '获取位置信息超时';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Mock reverse geocoding (Coordinate to Address)
 * In production, you would use Gaode/Baidu/Google Maps API here
 */
export const getAddressFromCoords = async (lat, lng) => {
  // This is a mock. Real app would call an API.
  return `模拟地址 (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
};
