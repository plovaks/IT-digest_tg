
export const getPlatform = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('messengermax') || 
      urlParams.get('initData') || 
      urlParams.get('init_data')) {
    return 'max';
  }
  
  if (window.Telegram?.WebApp?.initData || 
      userAgent.includes('telegram')) {
    return 'telegram';
  }
  
  if (urlParams.get('vk_access_token_settings')) {
    return 'vk';
  }
  
  return 'web';
};

export const openLink = (url, platform) => {
  console.log(`Opening link on ${platform}:`, url);
  
  if (platform === 'telegram' && window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(url);
  } 
  else if (platform === 'max') {
    
    window.open(url, '_blank');
  }
  else {
    window.open(url, '_blank');
  }
};

export const showAlert = (message, platform) => {
  if (platform === 'telegram' && window.Telegram?.WebApp?.showAlert) {
    window.Telegram.WebApp.showAlert(message);
  } 
  else {
    alert(message);
  }
};

export const expandApp = (platform) => {
  if (platform === 'telegram' && window.Telegram?.WebApp?.expand) {
    window.Telegram.WebApp.expand();
  }
  
};