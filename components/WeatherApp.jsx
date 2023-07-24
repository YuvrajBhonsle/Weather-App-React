import React, { useState, useEffect, useRef } from "react";
import "../src/WeatherApp.css";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { BiCurrentLocation } from "react-icons/bi";
import {
  FaTemperatureHigh,
  FaTemperatureLow,
  FaWind,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { WiHumidity } from "react-icons/wi";
import { TbTemperatureFahrenheit, TbTemperatureCelsius } from "react-icons/tb";

dayjs.extend(utc);
dayjs.extend(timezone);

function WeatherApp() {
  const [location, setLocation] = useState("");
  const [weatherData, setWeatherData] = useState({ names: [], locations: [] });
  const [currentWeather, setCurrentWeather] = useState(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [hourlyIndex, setHourlyIndex] = useState([]);
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState("");
  const [displayMode, setDisplayMode] = useState("daily");
  const [isInputActive, setIsInputActive] = useState(false);
  const [celsiusActive, setCelsiusActive] = useState(true);
  const [fahrenheitActive, setFahrenheitActive] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    let timeoutId;
    const fetchWeatherData = async () => {
      try {
        const AUTO_URL = `https://nominatim.openstreetmap.org/search?q=${location}&format=json&addressdetails=1`;
        const response = await fetch(AUTO_URL);

        if (response.ok) {
          const data = await response.json();
          const displayNames = data.map((item) => item.display_name);
          setWeatherData({
            names: displayNames,
            locations: data,
          });
        }
      } catch (error) {
        console.log("Error in autosuggestion", error);
      }
    };

    const handleInputChange = () => {
      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        fetchWeatherData();
      }, 500);
    };

    handleInputChange();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [location]);

  const handleChange = (e) => {
    setLocation(e.target.value);
  };

  const changeLocation = async (index, unit) => {
    const selectedLocation = weatherData.locations[index];
    const locationName = selectedLocation.display_name || selectedLocationName;
    setLocation(locationName);
    setSelectedLocationName(locationName);
    const latitude = selectedLocation.lat;
    const longitude = selectedLocation.lon;
    const tempUnit = unit === "celsius" ? "celsius" : "fahrenheit";
    await handleForecast(latitude, longitude, tempUnit);
  };

  const handleForecast = async (latitude, longitude, tempUnit) => {
    try {
      setIsLoading(true);
      const today = new Date();
      const todayContentBeforeT = today.toISOString().split("T")[0];
      const current = new Date();
      current.setDate(current.getDate() + 7);
      const currentContentBeforeT = current.toISOString().split("T")[0];
      const FORECAST_URL = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=auto&temperature_unit=${tempUnit}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_mean,sunrise,sunset,weathercode,precipitation_sum,apparent_temperature_max,apparent_temperature_max,windspeed_10m_max&hourly=apparent_temperature,weathercode&start_date=${todayContentBeforeT}&end_date=${currentContentBeforeT}&forecast_days=7`;
      const response = await fetch(FORECAST_URL);
      if (response.ok) {
        const forecastData = await response.json();
        // console.log(forecastData)

        // To get temp of the current hour
        const currentDate = dayjs();
        if (currentDate.minute() >= 0 || currentDate.minute() <= 59) {
          currentDate.startOf("hour").add(1, "hour");
        }
        const roundedDateISOString = currentDate.format("YYYY-MM-DDTHH:00:00");
        let feelsLike = "";
        feelsLike = forecastData.hourly.time.findIndex(
          (date) => date == roundedDateISOString
        );

        const timeZone = forecastData.timezone;
        const newCurrentDate = dayjs().tz(timeZone);
        const currentDateString = newCurrentDate.format("YYYY-MM-DD");
        const currentTimeString = newCurrentDate.format("HH:mm");
        const desiredIndices = [];
        forecastData.hourly.time.forEach((dateTime, index) => {
          const date = dateTime.split("T")[0];
          const time = dateTime.split("T")[1].slice(0, 5);
          // console.log("Time", time)

          if (date === currentDateString) {
            const [hours, minutes] = time.split(":");
            const [currentHours, currentMinutes] = currentTimeString.split(":");

            // if (
            //   (hours > currentHours && hours <= 23) ||
            //   (hours === currentHours && minutes >= currentMinutes)
            // ) {
            //   desiredIndices.push(index);
            // }

            if (
              date > currentDateString ||
              (date === currentDateString &&
                ((hours > currentHours && hours <= 23) ||
                  (hours === currentHours && minutes >= currentMinutes)))
            ) {
              desiredIndices.push(index);
            }
          }
        });
        // console.log(desiredIndices)
        setHourlyIndex(desiredIndices);
        // console.log(hourlyIndex);

        const time = [],
          weatherCode = [],
          tempHourly = [];
        desiredIndices.forEach((index) => {
          time.push(forecastData.hourly.time[index]);
          weatherCode.push(forecastData.hourly.weathercode[index]);
          tempHourly.push(forecastData.hourly.apparent_temperature[index]);
        });

        setCurrentWeather({
          temp:
            forecastData.current_weather.temperature +
            forecastData.daily_units.temperature_2m_min,
          minTemp:
            forecastData.daily.temperature_2m_min[0] +
            forecastData.daily_units.temperature_2m_min,
          maxTemp:
            forecastData.daily.temperature_2m_max[0] +
            forecastData.daily_units.temperature_2m_min,
          windSpeed:
            forecastData.current_weather.windspeed +
            forecastData.daily_units.windspeed_10m_max,
          humidity:
            forecastData.daily.precipitation_probability_mean[0] +
            forecastData.daily_units.precipitation_probability_mean,
          weatherCode: forecastData.current_weather.weathercode,
          currentHourTemp:
            forecastData.hourly.apparent_temperature.at(feelsLike) +
            forecastData.daily_units.temperature_2m_min,
          tempUnit: forecastData.daily_units.temperature_2m_min,
          foreCastDaily: forecastData.daily,
          foreCastDailyUnits: forecastData.daily_units,
          foreCastHourly: forecastData.hourly,
        });
      }
    } catch (err) {
      console.log("Forecast data fetching error", err);
    } finally {
      setIsLoading(false);
      setLocation("");
    }
  };

  const convertDateToLocaleString = (dateStr) => {
    const date = new Date(dateStr);
    const options = { month: "long", day: "numeric" };

    const formattedDate = date.toLocaleDateString("en-US", options);
    const dayOfMonth = date.getDate();
    let suffix = "th";

    if (dayOfMonth === 1 || dayOfMonth === 21 || dayOfMonth === 31) {
      suffix = "st";
    } else if (dayOfMonth === 2 || dayOfMonth === 22) {
      suffix = "nd";
    } else if (dayOfMonth === 3 || dayOfMonth === 23) {
      suffix = "rd";
    }

    const finalDate = formattedDate + suffix;
    return finalDate;
  };

  const convertDateToDay = (dateStr) => {
    const today = dayjs();
    const date = dayjs(dateStr);

    if (date.isSame(today, "day")) {
      return "Today";
    } else if (date.isSame(today.add(1, "day"), "day")) {
      return "Tomorrow";
    } else {
      return date.format("dddd");
    }
  };

  const handleUnitChange = async (unit, latitude, longitude) => {
    const selectedLocation =
      weatherData.locations[0] || location || selectedLocationName;
    let latitudeVal = latitude,
      longitudeVal = longitude;
    if (
      selectedLocation.lat != undefined ||
      selectedLocation.lon != undefined
    ) {
      latitudeVal = selectedLocation.lat;
      longitudeVal = selectedLocation.lon;
    } else {
      latitudeVal = latitude;
      longitudeVal = longitude;
    }
    if (unit === "celsius") {
      setCelsiusActive(true);
      setFahrenheitActive(false);
    } else if (unit === "fahrenheit") {
      setCelsiusActive(false);
      setFahrenheitActive(true);
    }
    const tempUnit = unit === "celsius" ? "celsius" : "fahrenheit";
    await handleForecast(latitudeVal, longitudeVal, tempUnit);
  };

  const handleCardClick = (index) => {
    setSelectedCardIndex(index);
  };

  const getWeatherIcon = (weatherCode) => {
    let iconPath = "";
    let description = "";

    switch (weatherCode) {
      case 0:
        iconPath = "/icons/clear-day.svg";
        description = "Clear sky";
        break;
      case 1:
        iconPath = "/icons/clear-day.svg";
        description = "Mainly Clear";
        break;
      case 2:
        iconPath = "/icons/partly-cloudy-day.svg";
        description = "Partly Cloudy";
        break;
      case 3:
        iconPath = "/icons/overcast.svg";
        description = "Overcast";
        break;
      case 45:
        iconPath = "/icons/fog.svg";
        description = "Fog";
        break;
      case 48:
        iconPath = "/icons/partly-cloudy-day-fog.svg";
        description = "Depositing Rime Fog";
        break;
      case 51:
        iconPath = "/icons/drizzle.svg";
        description = "Light Drizzle";
        break;
      case 53:
        iconPath = "/icons/drizzle.svg";
        description = "Moderate Drizzle";
        break;
      case 55:
        iconPath = "/icons/drizzle.svg";
        description = "Heavy Drizzle";
        break;
      case 56:
        iconPath = "/icons/drizzle.svg";
        description = "Light Freezing Drizzle";
        break;
      case 57:
        iconPath = "/icons/drizzle.svg";
        description = "Heavy Freezing Drizzle";
        break;
      case 61:
        iconPath = "/icons/rain.svg";
        description = "Light Rain";
        break;
      case 63:
        iconPath = "/icons/rain.svg";
        description = "Moderate Rain";
        break;
      case 65:
        iconPath = "/public/icons/rain.svg";
        description = "Heavy Rain";
        break;
      case 66:
        iconPath = "/icons/rain.svg";
        description = "Light Freezing Rain";
        break;
      case 67:
        iconPath = "/icons/rain.svg";
        description = "Heavy Freezing Rain";
        break;
      case 71:
        iconPath = "/icons/snow.svg";
        description = "Light Snow";
        break;
      case 73:
        iconPath = "/icons/snow.svg";
        description = "Moderate Snow";
        break;
      case 75:
        iconPath = "/icons/snow.svg";
        description = "Heavy Snow";
        break;
      case 77:
        iconPath = "/icons/sleet.svg";
        description = "Snow Grains";
        break;
      case 80:
        iconPath = "/icons/rain.svg";
        description = "Light Rain Showers";
        break;
      case 81:
        iconPath = "/icons/rain.svg";
        description = "Moderate Rain Showers";
        break;
      case 82:
        iconPath = "/icons/rain.svg";
        description = "Heavy Rain Showers";
        break;
      case 85:
        iconPath = "/icons/snow.svg";
        description = "Light Snow Showers";
        break;
      case 86:
        iconPath = "/icons/snow.svg";
        description = "Heavy Snow Showers";
        break;
      case 95:
        iconPath = "/icons/thunderstorms-rain.svg";
        description = "Thunderstorm";
        break;
      case 96:
        iconPath = "/icons/thunderstorms-snow.svg";
        description = "Thunderstorm with Light Hail";
        break;
      case 99:
        iconPath = "/icons/thunderstorms-snow.svg";
        description = "Thunderstorm with Heavy Hail";
        break;
      default:
        iconPath = "/icons/not-available.svg";
    }

    return { iconPath, description };
  };

  const handleGeoLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(success, error);
    } else {
      alert("Geolocation is not supported by this browser.");
    }

    function success(position) {
      const geoLatitude = position.coords.latitude;
      const geoLongitude = position.coords.longitude;
      setLatitude(geoLatitude);
      setLongitude(geoLongitude);
      handleReverseGeoLocation(geoLatitude, geoLongitude);
    }

    function error() {
      alert("User denied geolocation");
    }
  };

  const handleReverseGeoLocation = async (geoLatitude, geoLongitude) => {
    try {
      const REVERSE_GEO_URL = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${geoLatitude}&lon=${geoLongitude}`;
      const geoResponse = await fetch(REVERSE_GEO_URL);
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        setLocation(geoData.display_name);
        setSelectedLocationName(geoData.display_name);
        handleUnitChange("celsius", geoLatitude, geoLongitude);
      }
    } catch (error) {
      console.error("Error in fetching reverse geolocation", error);
    }
  };

  const handleInputFocus = () => {
    setIsInputActive(true);
  };

  const handleInputBlur = () => {
    setIsInputActive(false);
  };

  // const scrollToCard = (index) => {
  //   const container = containerRef.current;
  //   const cardWidth = container.offsetWidth;
  //   const newPosition = index * cardWidth;
  //   container.scrollTo({
  //     left: newPosition,
  //     behavior: "smooth",
  //   });
  //   setScrollPosition(newPosition);
  // };

  const scrollToLeft = () => {
    const container = containerRef.current;
    const cardWidth = container.offsetWidth;
    const newPosition = Math.max(0, scrollPosition - cardWidth);
    container.scrollTo({
      left: newPosition,
      behavior: "smooth",
    });
    setScrollPosition(newPosition);
  };

  const scrollToRight = () => {
    const container = containerRef.current;
    const cardWidth = container.offsetWidth;
    const newPosition = Math.min(
      container.scrollWidth - container.clientWidth,
      scrollPosition + cardWidth
    );
    container.scrollTo({
      left: newPosition,
      behavior: "smooth",
    });
    setScrollPosition(newPosition);
  };

  return (
    <>
      <div className="header-container">
        <div className="head-search-container">
          <div className="input-container">
            <div className="search-field">
              <input
                type="text"
                placeholder="Enter city"
                onChange={handleChange}
                value={location}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="head-input-field"
              />
              <button
                onClick={() => handleGeoLocation()}
                className="temp-button geo-btn"
              >
                <BiCurrentLocation />
              </button>
            </div>
            <div className="search-box">
              {!isLoading &&
              isInputActive &&
              (location === "" || weatherData.names.length === 0) ? (
                <p className="search-box-null">No location found</p>
              ) : (
                <ul className="dropdown-list">
                  {weatherData.names.map((name, index) => (
                    <li key={index} className="dropdown-item">
                      <a
                        href="#"
                        style={{ cursor: "pointer" }}
                        onClick={() => changeLocation(index, "celsius")}
                      >
                        {name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {currentWeather && (
            <div className="head-button-container">
              <button
                onClick={() => handleUnitChange("celsius", latitude, longitude)}
                className={`temp-button ${celsiusActive ? "active" : ""}`}
              >
                <TbTemperatureCelsius />
                Celsius
              </button>
              <button
                onClick={() =>
                  handleUnitChange("fahrenheit", latitude, longitude)
                }
                className={`temp-button ${fahrenheitActive ? "active" : ""}`}
              >
                <TbTemperatureFahrenheit />
                Fahrenheit
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="loader-container">
            <div className="nature-10"></div>
          </div>
        ) : (
          currentWeather && (
            <main className="head-main-container">
              <div className="main-location">
                <h2>{selectedLocationName}</h2>
              </div>

              <div className="main-img-container">
                <img
                  src={getWeatherIcon(currentWeather.weatherCode).iconPath}
                  alt="Current Weather Icon"
                />
                <h1>{currentWeather.temp}</h1>
                <h4>
                  {getWeatherIcon(currentWeather.weatherCode).description}
                </h4>
              </div>

              <div className="main-details-container">
                <div className="main-details-box">
                  <div className="main-details-icon">
                    <FaTemperatureLow
                      style={{
                        maxWidth: "100%",
                        height: "100%",
                        fontSize: "2rem",
                        color: "#111",
                        background: "transparent",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    />
                  </div>
                  <div className="main-details">
                    <p>Min Temperature</p>
                    <p>{currentWeather.minTemp}</p>
                  </div>
                </div>
                <div className="main-details-box">
                  <div className="main-details-icon">
                    <FaTemperatureHigh
                      style={{
                        maxWidth: "100%",
                        height: "100%",
                        fontSize: "2rem",
                        color: "#111",
                        background: "transparent",
                      }}
                    />
                  </div>
                  <div className="main-details">
                    <p>Max Temperature</p>
                    <p>{currentWeather.maxTemp}</p>
                  </div>
                </div>
                <div className="main-details-box">
                  <div className="main-details-icon">
                    <FaWind
                      style={{
                        maxWidth: "100%",
                        height: "100%",
                        fontSize: "2rem",
                        color: "#111",
                        background: "transparent",
                      }}
                    />
                  </div>
                  <div className="main-details">
                    <p>Wind Speed</p>
                    <p>{currentWeather.windSpeed}</p>
                  </div>
                </div>
                <div className="main-details-box">
                  <div className="main-details-icon">
                    <WiHumidity
                      style={{
                        maxWidth: "100%",
                        height: "100%",
                        fontSize: "3rem",
                        color: "#111",
                        background: "transparent",
                      }}
                    />
                  </div>

                  <div className="main-details">
                    <p>Humidity</p>
                    <p>{currentWeather.humidity}</p>
                  </div>
                </div>
              </div>
            </main>
          )
        )}
      </div>

      {isLoading ? (
        <div className="loader-container">
          <div className="nature-10"></div>
        </div>
      ) : (
        <section className="forecast-container">
          {currentWeather && (
            <div className="forecast-toggle-buttons">
              <button
                onClick={() => setDisplayMode("daily")}
                className={
                  displayMode === "daily"
                    ? "daily-forecast-btn active"
                    : "daily-forecast-btn"
                }
              >
                Daily Forecast
              </button>
              <button
                onClick={() => setDisplayMode("hourly")}
                className={
                  displayMode === "hourly"
                    ? "hourly-forecast-btn active"
                    : "hourly-forecast-btn"
                }
              >
                Hourly Forecast
              </button>
            </div>
          )}

          {currentWeather && displayMode === "daily" && (
            <div className="daily-forecast-carousel">
              <div
                className="daily-forecast-container"
                id="daily-forecast-container"
                ref={containerRef}
                style={{
                  scrollBehavior: "smooth",
                  overflowX: "scroll",
                }}
              >
                {/* Daily Forecast Cards */}
                {currentWeather &&
                  Array.from({ length: 8 }, (_, index) => (
                    <div
                      className="daily-forecast-card"
                      key={index}
                      onClick={() => handleCardClick(index)}
                    >
                      <h1 className="daily-forecast-day">
                        {currentWeather &&
                          convertDateToDay(
                            currentWeather.foreCastDaily.time.at(index)
                          )}
                      </h1>
                      <h3 className="daily-forecast-date">
                        {currentWeather &&
                          convertDateToLocaleString(
                            currentWeather.foreCastDaily.time.at(index)
                          )}
                      </h3>
                      <img
                        src={
                          getWeatherIcon(
                            currentWeather.foreCastDaily.weathercode[index]
                          ).iconPath
                        }
                        alt="Weather Icon"
                      />
                      <h4 className="daily-forecast-max-temp">
                        Max Temp:{" "}
                        {currentWeather &&
                          currentWeather.foreCastDaily.temperature_2m_max.at(
                            index
                          )}
                        {currentWeather && currentWeather.tempUnit}
                      </h4>
                      <h4 className="daily-forecast-min-temp">
                        Min Temp:{" "}
                        {currentWeather &&
                          currentWeather.foreCastDaily.temperature_2m_min.at(
                            index
                          )}
                        {currentWeather && currentWeather.tempUnit}
                      </h4>
                    </div>
                  ))}
              </div>
              <div className="carousel-navigation">
                <button className="carousel-button prev" onClick={scrollToLeft}>
                  <FaChevronLeft
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      borderRadius: "50%",
                      padding: "0.5rem",
                      fontSize: "2rem",
                    }}
                  />
                </button>
                <button
                  className="carousel-button next"
                  onClick={scrollToRight}
                >
                  <FaChevronRight
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      borderRadius: "50%",
                      padding: "0.5rem",
                      fontSize: "2rem",
                    }}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Details for Hourly Temp */}
          {currentWeather && displayMode === "hourly" && (
            <div className="hourly-forecast-carousel">
              <div
                className="hourly-forecast-container"
                id="daily-forecast-container"
                ref={containerRef}
                style={{
                  scrollBehavior: "smooth",
                  overflowX: "scroll",
                }}
              >
                {hourlyIndex.map((value, index) => (
                  <div key={index} className="hourly-forecast-card">
                    <h3 className="hourly-forecast-time">
                      {currentWeather.foreCastHourly.time[value].slice(-5)}
                    </h3>
                    <img
                      src={
                        getWeatherIcon(
                          currentWeather.foreCastHourly.weathercode[value]
                        ).iconPath
                      }
                      alt="Hourly Weather Icon"
                    />
                    <h3 className="hourly-forecast-temp">
                      {
                        currentWeather.foreCastHourly.apparent_temperature[
                          value
                        ]
                      }
                      {currentWeather.tempUnit}
                    </h3>
                  </div>
                ))}
              </div>
              {currentWeather && (
                <div className="carousel-navigation">
                  <button
                    className="carousel-button prev"
                    onClick={scrollToLeft}
                  >
                    <FaChevronLeft
                      style={{
                        background: "rgba(0,0,0,0.4)",
                        borderRadius: "50%",
                        padding: "0.5rem",
                        fontSize: "2rem",
                      }}
                    />
                  </button>
                  <button
                    className="carousel-button next"
                    onClick={scrollToRight}
                  >
                    <FaChevronRight
                      style={{
                        background: "rgba(0,0,0,0.4)",
                        borderRadius: "50%",
                        padding: "0.5rem",
                        fontSize: "2rem",
                      }}
                    />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Details for the Selected Day */}
          <section className="details-container">
            {currentWeather && selectedCardIndex !== null && (
              <>
                <h1 className="details-header">
                  Details for{" "}
                  {(currentWeather &&
                    convertDateToDay(
                      currentWeather.foreCastDaily.time.at(selectedCardIndex)
                    )) ||
                    "Today"}
                </h1>
                <div className="details-card-container">
                  <div className="details-card">
                    <h4 className="details-card-header">Sunrise</h4>
                    <img src="/icons/sunrise.svg" alt="Sunrise-icon" />
                    <h2 className="details-card-content">
                      {currentWeather &&
                        currentWeather.foreCastDaily.sunrise
                          .at(selectedCardIndex)
                          .slice(-5)}
                    </h2>
                  </div>
                  <div className="details-card">
                    <h4 className="details-card-header">Sunset</h4>
                    <img src="/icons/sunset.svg" alt="Sunset-icon" />
                    <h2 className="details-card-content">
                      {currentWeather &&
                        currentWeather.foreCastDaily.sunset
                          .at(selectedCardIndex)
                          .slice(-5)}
                    </h2>
                  </div>
                  <div className="details-card">
                    <h4 className="details-card-header">Highest Temperature</h4>
                    <img src="/icons/thermometer-warmer.svg" alt="Temp-max" />
                    <h2 className="details-card-content">
                      {currentWeather &&
                        currentWeather.foreCastDaily.temperature_2m_max.at(
                          selectedCardIndex
                        )}
                      {currentWeather && currentWeather.tempUnit}
                    </h2>
                  </div>
                  <div className="details-card">
                    <h4 className="details-card-header">Lowest Temperature</h4>
                    <img src="/icons/thermometer-colder.svg" alt="Temp-min" />
                    <h2 className="details-card-content">
                      {currentWeather &&
                        currentWeather.foreCastDaily.temperature_2m_min.at(
                          selectedCardIndex
                        )}
                      {currentWeather && currentWeather.tempUnit}
                    </h2>
                  </div>
                  <div className="details-card">
                    <h4 className="details-card-header">
                      Precipitation Probability
                    </h4>
                    <img src="/icons/raindrop.svg" alt="One-drop" />
                    <h2 className="details-card-content">
                      {currentWeather &&
                        currentWeather.foreCastDaily.precipitation_probability_mean.at(
                          selectedCardIndex
                        )}
                      %
                    </h2>
                  </div>
                  <div className="details-card">
                    <h4 className="details-card-header">Total Precipitation</h4>
                    <img src="/icons/raindrops.svg" alt="Two-drops" />
                    <h2 className="details-card-content">
                      {currentWeather &&
                        currentWeather.foreCastDaily.precipitation_sum.at(
                          selectedCardIndex
                        )}
                      mm
                    </h2>
                  </div>
                  <div className="details-card">
                    <h4 className="details-card-header">UV Index</h4>
                    <img src="/icons/uv-index.svg" alt="Sun-icon" />
                    <h2 className="details-card-content">
                      {currentWeather &&
                        currentWeather.foreCastDaily.uv_index_max.at(
                          selectedCardIndex
                        )}
                    </h2>
                  </div>
                  <div className="details-card">
                    <h4 className="details-card-header">Wind Speed</h4>
                    <img src="/icons/wind.svg" alt="Wind-icon" />
                    <h2 className="details-card-content">
                      {currentWeather &&
                        currentWeather.foreCastDaily.windspeed_10m_max.at(
                          selectedCardIndex
                        )}
                      {currentWeather &&
                        currentWeather.foreCastDailyUnits.windspeed_10m_max}
                    </h2>
                  </div>
                </div>
              </>
            )}
          </section>
        </section>
      )}
    </>
  );
}

export default WeatherApp;
