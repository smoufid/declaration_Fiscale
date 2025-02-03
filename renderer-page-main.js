const { ipcRenderer } = require("electron");

// Gestion de la navigation dynamique
document.getElementById("menu-versement").addEventListener("click", () => loadPage("retenueTvaSource.html"));
document.getElementById("menu-tva-etrangeres").addEventListener("click", () => loadPage("retenueTvaEtrangere.html"));
document.getElementById("menu-tva-fournisseurs").addEventListener("click", () => loadPage("page-tva-fournisseurs.html"));

function loadPage(page) {
    fetch(page)
        .then(response => response.text())
       .then(html => {
            document.getElementById("content").innerHTML = html;
            setupPageListeners();
        }) 
        .catch(error => console.error("Erreur de chargement de la page:", error));
}


