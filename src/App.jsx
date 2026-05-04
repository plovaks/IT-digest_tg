import { useEffect, useState } from 'react';
import { Tabbar } from '@telegram-apps/telegram-ui';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import EventsDigest from './components/eventsDigest/EventsDigest';
import Event from './pages/eventPage/Event';
import { Profile } from './pages/Profile/Profile';
import Feedback from './pages/Feedback/Feedback';
import Submissions from './pages/Submissions/Submissions'
import { ThemeWrapper } from './components/ThemeWrapper';
import './App.css';
import { TabbarItem } from '@telegram-apps/telegram-ui/dist/components/Layout/Tabbar/components/TabbarItem/TabbarItem';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [filters, setFilters] = useState({
    cities: [],
    categories: [],
    eventTypes: [],
    participationTypes: []
  });

  
  

  
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      if (location.pathname.includes('/events/')) {
        tg.BackButton.show();
        
        const handleBack = () => {
          navigate('/');
        };
        
        tg.onEvent('backButtonClicked', handleBack);
        
        return () => {
          tg.offEvent('backButtonClicked', handleBack);
          tg.BackButton.hide();
        };
      } else {
        tg.BackButton.hide();
      }
    }
  }, [location, navigate]);

  const getActiveTab = () => {
    if (location.pathname === '/' || location.pathname.includes('/events/')) return 'events';
    if (location.pathname === '/profile') return 'profile';
    if(location.pathname === '/feedback') return 'feedback';
    if (location.pathname === '/submissions') return 'submissions';
    return 'events';
  };

  const handleTabChange = (tab) => {
    if (tab === 'events') {
      navigate('/');
    } else if (tab === 'profile') {
      navigate('/profile');
    }else if (tab === 'feedback'){
      navigate('/feedback')
    }else if (tab === 'submissions'){
      navigate('/submissions')
    }
  };

  return (
    <ThemeWrapper>
      <div className="app-container">
      <div className="app-content" style={{ paddingBottom: '70px' }}>
        <Routes>
          <Route path='/' element={<EventsDigest filters={filters} setFilters={setFilters} />} />
          <Route path='/events/:id' element={<Event />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/feedback' element={<Feedback/>}/>
          <Route path='/submissions' element={<Submissions/>}/>
        </Routes>
      </div>
      
      <div className="bottom-nav">
        <Tabbar>
          <Tabbar.Item
            selected={getActiveTab() === 'events'}
            onClick={() => handleTabChange('events')}
            text="Мероприятия"
          />
          <Tabbar.Item
            selected={getActiveTab() === 'profile'}
            onClick={() => handleTabChange('profile')}
            text="Профиль"
          />
          <Tabbar.Item
            selected={getActiveTab() === 'feedback'}
            onClick={() => handleTabChange('feedback')}
            text="Обратная связь"
          />
          <Tabbar.Item
            selected={getActiveTab() === 'submissions'}
            onClick={() => handleTabChange('submissions')}
            text='Создать заявку на событие'
          />
        </Tabbar>
      </div>
    </div>
    </ThemeWrapper>
    
  );
}