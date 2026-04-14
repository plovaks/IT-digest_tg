import { useState } from 'react';
import { Tabbar, List, Section, Cell, Headline } from '@telegram-apps/telegram-ui';
import { Routes, Route, useNavigate } from 'react-router-dom';
import EventsDigest from './components/eventsDigest/EventsDigest';
import Event from './pages/eventPage/Event';
export default function App() {
  
  const [activeTab, setActiveTab] = useState('events');
  const navigate = useNavigate();

  const handleTabClick = (tab) =>{
    setActiveTab(tab);
    if( tab === 'events')
      navigate('/')
  }
  return (
    <div > 
      <Routes>
        <Route path='/' element={<EventsDigest/>}/>
        <Route path='/events/:id' element={<Event/>}/>
      </Routes>
      
      <Tabbar className=''>
        <Tabbar.Item 
          text="Дайджест" 
          selected={activeTab === 'events'} 
          onClick={() => handleTabClick('events')} 
        />
        
      </Tabbar>
      
    </div>
  );
}
