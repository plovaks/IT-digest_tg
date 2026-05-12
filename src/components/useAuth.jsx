import { useState, useEffect, useCallback } from 'react';

const PLATFORMS = {
  TELEGRAM: 'telegram',
  VK: 'vk',
  MAX: 'max',
  WEB: 'web'
};

const AUTH_ENDPOINTS = {
  [PLATFORMS.TELEGRAM]: 'https://ritmevents.ru/api/v1/auth/telegram',
  [PLATFORMS.VK]: 'https://ritmevents.ru/api/v1/auth/vk',
  [PLATFORMS.MAX]: 'https://ritmevents.ru/api/v1/auth/max'
};

const detectPlatform = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userAgent = navigator.userAgent.toLowerCase();
  
  
  // Проверяем window.WebApp (после загрузки скрипта max-web-app.js)
  if (typeof window !== 'undefined' && window.WebApp?.initData) {
    console.log(' MAX detected via window.WebApp.initData');
    return PLATFORMS.MAX;
  }
  
  // Max по userAgent и параметрам (запасной вариант)
  if (userAgent.includes('messengermax') || 
      urlParams.get('initData') || 
      urlParams.get('init_data') ||
      window.__MESSENGER_MAX__) {
    console.log(' MAX detected via userAgent/params');
    return PLATFORMS.MAX;
  }
  
  // Telegram
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
    console.log(' Telegram detected');
    return PLATFORMS.TELEGRAM;
  }
  
  if (userAgent.includes('telegram') || urlParams.get('tgWebAppData')) {
    return PLATFORMS.TELEGRAM;
  }
  
  // VK
  if (urlParams.get('vk_access_token_settings') || 
      urlParams.get('vk_app_id') || 
      urlParams.get('vk_platform')) {
    return PLATFORMS.VK;
  }
  
  console.log(' No platform detected, using WEB');
  return PLATFORMS.WEB;
};

const getInitData = (platform) => {
  switch (platform) {
    case PLATFORMS.TELEGRAM:
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        return window.Telegram.WebApp.initData;
      }
      return null;
      
    case PLATFORMS.VK:
      const urlParams = new URLSearchParams(window.location.search);
      return {
        init_data: urlParams.get('vk_init_data') || urlParams.get('init_data'),
        vk_user_id: urlParams.get('vk_user_id'),
        vk_app_id: urlParams.get('vk_app_id'),
        sign: urlParams.get('sign')
      };
      
    case PLATFORMS.MAX:
      //  Берем initData из window.WebApp
      if (typeof window !== 'undefined' && window.WebApp?.initData) {
        console.log('📡 Getting MAX initData from window.WebApp');
        return window.WebApp.initData;
      }
      // Fallback на URL параметры
      const urlInitData = new URLSearchParams(window.location.search).get('initData') || 
                          new URLSearchParams(window.location.search).get('init_data');
      return urlInitData;
      
    default:
      return null;
  }
};

export const useAuth = () => {
  const [platform, setPlatform] = useState(null);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showInputCode, setShowInputCode] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [userData, setUserData] = useState(null);

  const fetchUserData = useCallback(async (accessToken) => {
    console.log(' Fetching user data...');
    try {
      const res = await fetch('https://ritmevents.ru/api/v1/users/me', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        console.log('User data received:', data);
        setUserId(data.id);
        setUserData(data); 
        localStorage.setItem('user_id', String(data.id));
        return data;
      }
      console.log('Failed to fetch user data:', res.status);
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }, []);

  const authorize = useCallback(async (platformType) => {
    console.log(`Authorizing on ${platformType}...`);
    const initData = getInitData(platformType);
    
    if (!initData) {
      console.log(` No initData for platform: ${platformType}`);
      return { success: false, error: 'No init data' };
    }
    
    console.log(`InitData obtained, length: ${typeof initData === 'string' ? initData.length : 'object'}`);
    
    try {
      const body = platformType === PLATFORMS.VK ? initData : { init_data: initData };
      
      const response = await fetch(AUTH_ENDPOINTS[platformType], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      console.log(`Auth response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Auth successful');
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('platform', platformType);
        setToken(data.access_token);
        await fetchUserData(data.access_token);
        setIsAuthReady(true);
        return { success: true };
      }
      
      const errorText = await response.text();
      console.log(`Auth failed: ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    } catch (error) {
      console.error(`Auth error:`, error);
      return { success: false, error: error.message };
    }
  }, [fetchUserData]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Небольшая задержка для инициализации WebApp в Max
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('Initializing auth...');
        console.log('window.WebApp:', window.WebApp ? 'exists' : 'not found');
        console.log('window.Telegram:', window.Telegram ? 'exists' : 'not found');
        
        const detectedPlatform = detectPlatform();
        console.log('Detected platform:', detectedPlatform);
        setPlatform(detectedPlatform);
        
        // Пробуем авторизоваться на текущей платформе
        if (detectedPlatform !== PLATFORMS.WEB) {
          const result = await authorize(detectedPlatform);
          if (result.success) {
            setIsCheckingAuth(false);
            return;
          }
          setAuthError(result.error);
        }
        
        // Проверяем сохранённый токен
        const savedToken = localStorage.getItem('access_token');
        if (savedToken) {
          console.log('Checking saved token');
          const userData = await fetchUserData(savedToken);
          if (userData) {
            console.log('Saved token works');
            setIsAuthReady(true);
            setIsCheckingAuth(false);
            return;
          }
        }
        
        // Показываем ввод кода
        console.log('Showing code input');
        setShowInputCode(true);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setShowInputCode(true);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    initAuth();
  }, [authorize, fetchUserData]);

  return {
    platform,
    token,
    userId,
    userData,
    isAuthReady,
    isCheckingAuth,
    showInputCode,
    setShowInputCode,
    authError,
    setAuthError,
    setIsAuthReady,
    setToken,
    setUserId,
    authorize
  };
};