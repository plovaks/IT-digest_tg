import './Filters.css'
import { CITIES, CATEGORIES, EVENT_TYPES, PARTICIPATION_TYPES } from "../../data/filters.js"
import closeIcon from "../../assets/icons/close.svg"
import { useEffect, useState } from "react"

export default function Filters({ filters, onFilterChange, isOpen, setIsOpen, onReset }) {
  const [tempFilters, setTempFilters] = useState(filters);

  useEffect(() => {
    if (isOpen) {
      setTempFilters(filters);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, filters]);

  const handleFilterChange = (sectionKey, value) => {
    const currentValues = tempFilters[sectionKey] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    setTempFilters({ ...tempFilters, [sectionKey]: newValues });
  };

  const selectAllCategories = () => {
    setTempFilters({ ...tempFilters, categories: [...CATEGORIES] });
  };

  const clearAllCategories = () => {
    setTempFilters({ ...tempFilters, categories: [] });
  };

  const selectAllCities = () => {
    setTempFilters({ ...tempFilters, cities: [...CITIES] });
  };

  const clearAllCities = () => {
    setTempFilters({ ...tempFilters, cities: [] });
  };

  const selectAllEventTypes = () => {
    setTempFilters({ ...tempFilters, eventTypes: [...EVENT_TYPES] });
  };

  const clearAllEventTypes = () => {
    setTempFilters({ ...tempFilters, eventTypes: [] });
  };

  const selectAllParticipationTypes = () => {
    setTempFilters({ ...tempFilters, participationTypes: [...PARTICIPATION_TYPES] });
  };

  const clearAllParticipationTypes = () => {
    setTempFilters({ ...tempFilters, participationTypes: [] });
  };

  const applyFilters = () => {
    onFilterChange(tempFilters);
    setIsOpen(false);
  };

  const resetFilters = () => {
    const emptyFilters = {
      cities: [],
      categories: [],
      eventTypes: [],
      participationTypes: []
    };
    setTempFilters(emptyFilters);
    if (onReset) onReset();
  };

  if (!isOpen) return null;

  const isAllCategoriesSelected = tempFilters.categories.length === CATEGORIES.length;
  const isAllCitiesSelected = tempFilters.cities.length === CITIES.length;
  const isAllEventTypesSelected = tempFilters.eventTypes.length === EVENT_TYPES.length;
  const isAllParticipationTypesSelected = tempFilters.participationTypes.length === PARTICIPATION_TYPES.length;

  return (
    <div className="filters-drawer-overlay" onClick={applyFilters}>  
      <div className="filters-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="filters__header">
          <h1>Фильтры</h1>
          <button className='close-filter-btn' onClick={applyFilters}>  
            <img src={closeIcon} alt="close" />
          </button>
        </div>

        <div className="filter-section">
          <div className="filter-section-header">
            <h3 className="filter-section__title">Категории</h3>
            <button
              className='filter-section--chooseAll'
              onClick={isAllCategoriesSelected ? clearAllCategories : selectAllCategories}
            >
              {isAllCategoriesSelected ? 'Очистить все' : 'Выбрать все'}
            </button>
          </div>
          <div className="chips-container">
            {CATEGORIES.map((category, index) => (
              <button 
                key={index} 
                className={`chip ${tempFilters.categories.includes(category) ? 'chip-active' : ''}`}  
                onClick={() => handleFilterChange('categories', category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-section-header">
            <h3 className="filter-section__title">Город</h3>
            <button
              className='filter-section--chooseAll'
              onClick={isAllCitiesSelected ? clearAllCities : selectAllCities}
            >
              {isAllCitiesSelected ? 'Очистить все' : 'Выбрать все'}
            </button>
          </div>
          <div className="chips-container">
            {CITIES.map((city, index) => (
              <button 
                key={index} 
                className={`chip ${tempFilters.cities.includes(city) ? 'chip-active' : ''}`}  
                onClick={() => handleFilterChange('cities', city)}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-section-header">
            <h3 className="filter-section__title">Тип мероприятия</h3>
            <button
              className='filter-section--chooseAll'
              onClick={isAllEventTypesSelected ? clearAllEventTypes : selectAllEventTypes}
            >
              {isAllEventTypesSelected ? 'Очистить все' : 'Выбрать все'}
            </button>
          </div>
          <div className="chips-container">
            {EVENT_TYPES.map((type, index) => (
              <button 
                key={index} 
                onClick={() => handleFilterChange('eventTypes', type)}
                className={`chip ${tempFilters.eventTypes.includes(type) ? 'chip-active' : ''}`}  
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-section-header">
            <h3 className='filter-section__title'>Тип участия</h3>
            <button
              className='filter-section--chooseAll'
              onClick={isAllParticipationTypesSelected ? clearAllParticipationTypes : selectAllParticipationTypes}
            >
              {isAllParticipationTypesSelected ? 'Очистить все' : 'Выбрать все'}
            </button>
          </div>
          <div className='chips-container'>
            {PARTICIPATION_TYPES.map((partType, index) => (
              <button 
                key={index} 
                className={`chip ${tempFilters.participationTypes.includes(partType) ? 'chip-active' : ''}`}  
                onClick={() => handleFilterChange('participationTypes', partType)}
              >
                {partType}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-actions">
          <button className='apply-filters__btn' onClick={applyFilters}> 
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