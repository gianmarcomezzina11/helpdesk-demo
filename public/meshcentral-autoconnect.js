// Script per auto-connessione desktop in MeshCentral
(function() {
    console.log('🚀 MeshCentral Auto-Connect Script caricato');
    
    // Funzione per auto-click sul pulsante Desktop
    function autoConnectDesktop() {
        // Cerca il pulsante Desktop in vari modi
        const desktopButton = document.querySelector('input[value="Desktop"]') ||
                            document.querySelector('input[onclick*="connectDesktop"]') ||
                            document.querySelector('#connectbutton1') ||
                            document.querySelector('input[type="button"][value*="Desktop"]');
        
        if (desktopButton && desktopButton.style.display !== 'none') {
            console.log('✅ Pulsante Desktop trovato, click automatico!');
            desktopButton.click();
            return true;
        }
        return false;
    }
    
    // Prova a connettersi dopo il caricamento
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(autoConnectDesktop, 1000);
        });
    } else {
        setTimeout(autoConnectDesktop, 1000);
    }
    
    // Retry ogni secondo per 10 secondi se non trova il pulsante
    let retries = 0;
    const maxRetries = 10;
    const retryInterval = setInterval(function() {
        if (autoConnectDesktop() || retries >= maxRetries) {
            clearInterval(retryInterval);
            if (retries >= maxRetries) {
                console.log('⚠️ Pulsante Desktop non trovato dopo ' + maxRetries + ' tentativi');
            }
        }
        retries++;
    }, 1000);
})();
