const { ipcRenderer, remote } = require('electron');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Ajout de la date
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "log/log-tvaClient.log" }),
  ],
});
function cleanText(text) {
    return text.replace(/[^\w\s]/gi, '');
}
function formatDate(dateStr) {
    // On suppose que la date est dans le format "dd/MM/yyyy"
    const [day, month, year] = dateStr.split('/');

    // Créer un objet Date en utilisant les valeurs extraites
    const date = new Date(year, month - 1, day); // Les mois commencent à 0 dans l'objet Date

    // Formater la date dans le format "yyyy-MM-dd"
    const formattedDate = date.toISOString().split('T')[0];

    return formattedDate;
}
function getFormattedDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Mois commence à 0
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}
// Fonction pour lire le fichier CSV
function readCSV(filePath, callback) {
    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            console.error("❌ Erreur de lecture du fichier CSV :", err);
            alert("❌ Erreur de lecture du fichier CSV : " + err.message);
            return;
        }

        try {
            const lines = data.split("\n").map(line => line.trim()).filter(line => line !== "");
            let generalData = {};
            let versements = [];

            lines.forEach((line, index) => {
                const parts = line.split(";").map(part => part.trim());

                if (parts[0] === "E") {
                    logger.info("Ligne E : " + JSON.stringify(parts, null, 2));
                    generalData = {
                        identifiantFiscal: parts[1],
                        annee: parts[2]
                    };
                } else if (parts[0] === "D") {
                    try {
                        logger.info("Ligne D : " + JSON.stringify(parts, null, 2));
                        versements.push({
                            nomPrenomAdh: cleanText(parts[1]),
                            montantCreance: parseFloat(parts[2].replace(",", ".")), // Nettoyage du texte
                            tauxTva: cleanText(parts[3].replace("%","")),
                            tvaCorrespondante: parseFloat(parts[4].replace(",", "."))
                        });
                    } catch (fieldErr) {
                        const fieldName = ['nomPrenomAdh', 'montantCreance', 'tauxTva', 'tvaCorrespondante'][index];
                        console.error(`❌ Erreur lors de l'analyse du champ ${fieldName} à la ligne ${index + 1} :`, fieldErr);
                        alert(`❌ Erreur lors de l'analyse du champ ${fieldName} à la ligne ${index + 1} : ${fieldErr.message}`);
                    }
                }
            });

            callback({ generalData, versements });
        } catch (parseErr) {
            console.error("❌ Erreur lors de l'analyse du fichier CSV :", parseErr);
            alert("❌ Erreur lors de l'analyse du fichier CSV : " + parseErr.message);
        }
    });
}

// Fonction pour générer le fichier XML
function generateXML(data, outputDir) {
    const { generalData, versements } = data;

    const xmlData = {
        DeclarationDebiteurs: {
            identifiantFiscal: generalData.identifiantFiscal,
            annee: generalData.annee,
            clients: {
                client: versements.map(v => ({
                    nomPrenomAdh: v.nomPrenomAdh,
                    montantCreance: v.montantCreance.toFixed(2), // Conversion en nombre
                    tauxTva: v.tauxTva,
                    tvaCorrespondante: v.tvaCorrespondante.toFixed(2) // Conversion en nombre
                }))
            }
                          }
    };

    const builder = new xml2js.Builder({ headless: false, renderOpts: { pretty: true } });
    const xmlContent = builder.buildObject(xmlData);
    const uuid = crypto.randomUUID();
    const datesys = getFormattedDate();
    const fileName = `TVA_CLIENT_DEBITEUR_${uuid}.xml`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFile(filePath, xmlContent, (err) => {
        if (err) {
            logger.error(`Erreur lors de la génération du fichier XML : ${err.message}`,err);
            alert("❌ Erreur lors de la génération du fichier XML :", err);
        } else {
            alert(`✅ Fichier XML généré avec succès : ${filePath}`);
        }
    });
}

// Écouter l'événement 'file-opened' envoyé depuis main.js


document.getElementById('convertButtonType1').addEventListener('click', () => {
    ipcRenderer.on('file-opened', (event, filePath) => {
        alert('Fichier ouvert: ' + filePath);  // Afficher une alerte pour confirmer que le fichier a été ouvert
        readCSV(filePath, (data) => {
            const outputDir = path.dirname(filePath);
            generateXML(data, outputDir);
        });
    });
   // console.log('Convert button clicked'); // Log pour débogage
    const fileInput = document.getElementById('fileInputType1');
    if (fileInput.files.length === 0) {
        alert('Please select a CSV file first.');
        return;
    }

    const file = fileInput.files[0];
    if (!file) {
        alert('No file selected');
        return;
    }

    //alert('File selected: ' + file.name); // Afficher le nom du fichier

    const reader = new FileReader();
    reader.onload = function (e) {
        const csvData = e.target.result;
        //alert('CSV data loaded'); // Log pour débogage
const filetrt = 'd:/dectva/in/'+file.name;
        // Passer les données CSV lues pour traitement
        readCSV(filetrt, (data) => {
            const outputDir =  'd:/dectva/out/';
            generateXML(data, outputDir);
        });
    };

    reader.readAsText(file);

});
