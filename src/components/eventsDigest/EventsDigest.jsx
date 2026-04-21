import React, { useState, useMemo, useEffect, useCallback} from "react";
import { Button, Placeholder } from '@telegram-apps/telegram-ui';
import eventsData from "../../data/mock_events.json";
import './EventsDigest.css';
import { Link } from "react-router-dom";
import Filters from "../Filters/Filters";

import dateIcon from "../../assets/icons/DateRange.svg";
import timeIcon from "../../assets/icons/time.svg";
import priceIcon from "../../assets/icons/currency.svg";
import placeIcon from "../../assets/icons/Place.svg";

export default function EventsDigest({ filters, setFilters }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);

  const activeCount = Object.values(filters).flat().length;
  const hasFilters = activeCount > 0;

  const shouldShowDrawer = !isCheckingAuth && !hasFilters;

 



  const filteredEvents = useMemo(() => {
    if (!hasFilters) return [];
    
    return eventsData.filter(event => {
        
        if (filters.cities.length > 0 && !event.city?.some(c => filters.cities.includes(c))) return false;
        
        
        if (filters.categories.length > 0 && !event.track?.some(t => filters.categories.includes(t))) return false;
        
       
        if (filters.eventTypes.length > 0 && !event.event_type?.some(t => filters.eventTypes.includes(t))) return false;
        
       
        if (filters.participationTypes.length > 0) {
            const eventParticipationTypes = event.participation_type?.split(',').map(p => p.trim()) || [];
            const hasMatch = eventParticipationTypes.some(p => filters.participationTypes.includes(p));
            if (!hasMatch) return false;
        }
        
        return true;
    });
}, [filters, hasFilters]);

  const saveFiltersToServer = useCallback(async (newFilters, authToken, uid) => {
    if (!authToken || !uid) return false;

    try {
      const payload = {
        city: newFilters.cities.join(','),
        track: newFilters.categories.join(','),
        preferred_event_types: newFilters.eventTypes.join(','),
        preferred_participation_types: newFilters.participationTypes.join(',')
      };

      const response = await fetch(`https://ritmevents.ru/api/v1/users/${uid}/filters`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok){
        console.log('filters saved')
        return true;
      }
      
    } catch (error) {
      console.log('error while saving filters: ', error);
      return false;
    }
  
  }, []);

  const handleFilterChange = useCallback(async (newFilters) => {
    setFilters(newFilters);
    if (token && uid ){
      saveFiltersToServer(newFilters, token, userId);
    }
  }, [token, userId, setFilters, saveFiltersToServer])

  const resetFilters = useCallback(async () => {
    const emptyFilters = {
      cities: [],
      categories: [],
      eventTypes: [],
      participationTypes: []
    };
    setFilters(emptyFilters);
    if (token && userId) {
      await saveFiltersToServer(emptyFilters, token, userId);
    }
  }, [token, userId, setFilters, saveFiltersToServer]);
   
  useEffect(() => {
    const handleAuth = async () => {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData;
      const telegramId = tg?.initDataUnsafe?.user?.id;

      try {
        // авторизация пользователя по апи
        const response = await fetch('https://ritmevents.ru/api/v1/auth/telegram', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ init_data: initData }),
        });
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          
          setToken(data.access_token);
          setIsLoggedIn(true);

          if (telegramId) {
            const userRes = await fetch('https://ritmevents.ru/api/v1/users/me', {
   
            headers: { 
                'Authorization': `Bearer ${data.access_token}`,
                'Content-Type': 'application/json'  
            }
        });

            if (userRes.ok) {
              const userData = await userRes.json();
              setUserId(userData.id);
               console.log(' Данные пользователя с сервера:', userData);
              const newFilters = {
    
                  cities: userData.city ? userData.city.split(',').map(c => c.trim()) : [],
                  
                  categories: userData.track ? userData.track.split(',').map(t => t.trim()) : [],
                  
                  eventTypes: userData.preferred_event_types 
                      ? userData.preferred_event_types.split(',').map(e => e.trim()) 
                      : [],
                  
                  participationTypes: userData.preferred_participation_types 
                      ? userData.preferred_participation_types.split(',').map(p => p.trim()) 
                      : []
              };
              console.log(' Установлены фильтры:', newFilters);
              setFilters(newFilters);
              const hasUserFilters = Object.values(newFilters).flat().length > 0;
               console.log(' Есть фильтры у пользователя?', hasUserFilters);
              setIsDrawerOpen(!hasUserFilters);
            } else {
              setIsDrawerOpen(true);
            }
          }
        } else {
          setIsLoggedIn(false);
          setIsDrawerOpen(true);
        }
      } catch (error) {
        console.log('ошибка: ', error);
        setIsLoggedIn(false);
        setIsDrawerOpen(true);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    handleAuth();
  }, [setFilters]);

    useEffect(() => {
    if (!isCheckingAuth && !hasFilters) {
      setIsDrawerOpen(true);
    }
  }, [isCheckingAuth, hasFilters]);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

 

  return (
    <div className="events">
      <div className="filters-header-sticky">
        <Button 
          mode="outline" 
          stretched 
          size="m" 
          onClick={() => setIsDrawerOpen(true)} 
          className="filters-open-btn"
        >
          Фильтры {hasFilters && `(${activeCount})`}
        </Button>
      </div>

      <Filters 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        isOpen={isDrawerOpen} 
        setIsOpen={setIsDrawerOpen} 
        onReset={resetFilters}
      />

      <div className="digest-list">
        {!hasFilters ? (
          <Placeholder 
            className="placeholder"
            header="Выберите фильтры" 
            description="Нажмите на кнопку «Фильтры» и выберите интересующие вас параметры, чтобы увидеть мероприятия"
          />
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map(event => (
            <div key={event.id} className="digest__item">
              <div className="digest__header">
                <p className="digest__type">{event.event_type?.join(', ')}</p>
                <h3 className="digest__title">{event.title}</h3>
              </div>
              <div className="digest__mainInfo">
                <div className="digest__date-row">
                  {event.start_date && (
                    <div className="digest__day"><img src={dateIcon} alt="icon" /> {event.start_date.split('-').reverse().join('.')}</div>
                  )}
                  {event.start_time && (
                    <div className="digest__time"><img src={timeIcon} alt="icon" /> {event.start_time}</div>
                  )}
                </div>
                {Number.isInteger(event.price) && (
                  <div className="digest__price"><img src={priceIcon} alt="ruble icon" /> {event.price === 0 ? "Бесплатно" : event.price}</div>
                )}
                <div className="digest__location"><img src={placeIcon} alt="icon" /> {event.city?.join(', ')}</div>
              </div>
              {event.tags && event.tags.length > 0 && (
                <div className="digest__tags">
                  {event.tags.map((tag, index) => (
                    <span key={index} className="digest__tag">#{tag}</span>
                  ))}
                </div>
              )}
              <Link to={`/events/${event.id}`} className="digest__link">
                <button className="btn digest__knowMore">ПОДРОБНЕЕ</button>
              </Link>
            </div>
          ))
        ) : (
          <Placeholder
            className="placeholder"
            header="Ничего не найдено"
            description="Попробуйте изменить параметры фильтрации"
          />
        )}
      </div>
    </div>
  );
}