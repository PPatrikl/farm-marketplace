import { useEffect, useState } from 'react';

import { apiRequest } from './services/api';

function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadHealth() {
      try {
        const data = await apiRequest('/health');

        if (!isMounted) {
          return;
        }

        setHealth(data);
        setError('');
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(requestError.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">Farm Marketplace</p>
        <h1>Maanviljelijät, työnhakijat ja kerääjät samassa paikassa.</h1>
        <p className="lead">
          Tämä on React-pohjainen frontend, jonka kautta voidaan näyttää ilmoituksia,
          hakea töitä ja hallita markkinapaikan sisältöä.
        </p>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Backend-yhteys</h2>
          {loading ? (
            <p>Haetaan yhteyttä backendistä...</p>
          ) : error ? (
            <p>Yhteys epäonnistui: {error}</p>
          ) : (
            <p>
              Yhteys toimii: {health.status} / {health.service}
            </p>
          )}
        </section>
        <section className="card">
          <h2>Frontend</h2>
          <p>React + Vite -sovellus, jossa näkymät, komponentit ja API-kutsut pidetään erillään.</p>
        </section>
        <section className="card">
          <h2>Backend</h2>
          <p>Node.js + Express -API, joka palvelee frontendin ja mahdolliset mobiilisovellukset.</p>
        </section>
        <section className="card">
          <h2>Tietokanta</h2>
          <p>PostgreSQL-skeema ja seedit sijaitsevat omassa database-kansiossa.</p>
        </section>
      </main>
    </div>
  );
}

export default App;
