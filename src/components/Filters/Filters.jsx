import './Filters.css'
import { CITIES, CATEGORIES, EVENT_TYPES, PARTICIPATION_TYPES } from "../../data/filters.js"
import closeIcon from "../../assets/icons/close.svg"
import { useEffect } from "react"

export default function Filters({ filters, onFilterChange, isOpen, setIsOpen , onReset}) {

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  const handleFilterChange = (sectionKey, value) => {
    const currentValues = filters[sectionKey] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    onFilterChange({ ...filters, [sectionKey]: newValues });
  };

  const resetFilters = () => {
    onFilterChange({
      cities: [],
      categories: [],
      eventTypes: [],
      participationTypes: []
    });
    if (onReset) onReset();
  };

  if (!isOpen) return null;

  return (
    <div className="filters-drawer-overlay" onClick={() => setIsOpen(false)}>
      <div className="filters-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="filters__header">
          <h1>Фильтры</h1>
          <button className='close-filter-btn' onClick={() => setIsOpen(false)}>
            <img src={closeIcon} alt="close" />
          </button>
        </div>

        <div className="filter-section">
          <h3 className="filter-section__title">Категории</h3>
          <div className="chips-container">
            {CATEGORIES.map((category, index) => (
              <button 
                key={index} 
                className={`chip ${filters.categories.includes(category) ? 'chip-active' : ''}`}
                onClick={() => handleFilterChange('categories', category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h3 className="filter-section__title">Город</h3>
          <div className="cities-list">
            {CITIES.map((city, index) => (
              <label key={index} className='checkbox-item'>
                <input 
                  type="checkbox" 
                  checked={filters.cities.includes(city)} 
                  onChange={() => handleFilterChange('cities', city)} 
                />
                <span>{city}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h3 className="filter-section__title">Тип мероприятия</h3>
          <div className="chips-container">
            {EVENT_TYPES.map((type, index) => (
              <button 
                key={index} 
                onClick={() => handleFilterChange('eventTypes', type)}
                className={`chip ${filters.eventTypes.includes(type) ? 'chip-active' : ''}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h3 className='filter-section__title'>Тип участия</h3>
          <div className='participateType-list'>
            {PARTICIPATION_TYPES.map((partType, index) => (
              <label key={index} className='checkbox-item'>
                <input 
                  type="checkbox" 
                  checked={filters.participationTypes.includes(partType)} 
                  onChange={() => handleFilterChange('participationTypes', partType)} 
                />
                <span>{partType}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-actions">
          <button className='apply-filters__btn' onClick={() => setIsOpen(false)}>
            Показать результаты
          </button>
          <button className='reset-filters__btn' onClick={resetFilters}>
            Сбросить всё
          </button>
        </div>
      </div>
    </div>
  );
}
