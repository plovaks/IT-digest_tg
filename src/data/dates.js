export const generateDates = (count = 30) => {
  const days = []; 
  const date = new Date();

  for (let i = 0; i < count; i++) {
    const tempDate = new Date();
    tempDate.setDate(date.getDate() + i);

    days.push({
      day: tempDate.getDate().toString().padStart(2, '0'),
      weekday: tempDate.toLocaleDateString('ru-RU', { weekday: 'short' }),
      month: tempDate.toLocaleDateString('ru-RU', { month: 'short' }),
      fullDate: tempDate.toISOString().split('T')[0]
    });
  }
  
  return days; 
};
