const { ipcRenderer, remote } = require("electron");
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
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
    new winston.transports.File({ filename: "log/log-tvaEtrangere.log" }),
  ],
});
function cleanText(text) {
  return text.replace(/[^\w\s]/gi, "");
}
function formatDate(dateStr) {
  // On suppose que la date est dans le format "dd/MM/yyyy"
  const [day, month, year] = dateStr.split("/");

  // Créer un objet Date en utilisant les valeurs extraites
  const date = new Date(year, month - 1, day); // Les mois commencent à 0 dans l'objet Date

  // Formater la date dans le format "yyyy-MM-dd"
  const formattedDate = date.toISOString().split("T")[0];

  return formattedDate;
}
// Fonction pour lire le fichier CSV
function readCSV(filePath, callback) {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      alert("❌ Erreur de lecture du fichier CSV :", err);
      return;
    }

    const lines = data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");
    let generalData = {};
    let versements = [];

    lines.forEach((line) => {
      const parts = line.split(";").map((part) => part.trim());

      if (parts[0] === "E") {
        try {
          logger.info("Ligne E : " + JSON.stringify(parts, null, 2));
          generalData = {
            identifiantFiscal: parts[1],
            annee: parts[2],
            periode: parts[3],
            regime: "1",
          };
        } catch (error) {
          logger.error(
            `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
          );
          alert(
            `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
          );
          return;
        }
      } else if (parts[0] === "D") {
        try {
          logger.info("Ligne D : " + JSON.stringify(parts, null, 2));
          versements.push({
            nomPrenomOuRaisonSociale: cleanText(parts[1]), // Nettoyage du texte
            adresseEtranger: cleanText(parts[2]),
            nIdentificationFiscale: cleanText(parts[3]), // Nettoyage du texte
            natureOperation: cleanText(parts[4]),
            datePaiement: formatDate(parts[5]),
            baseImposableHT: parseFloat(parts[6].replace(",", ".")), // Conversion en nombre
            taux: parseFloat(parts[7].replace(",", ".")),
            tvaExigible: parseFloat(parts[8].replace(",", ".")),
          });
        } catch (error) {
          logger.error(
            `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
          );
          alert(
            `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
          );
          return;
        }
      }
    });
    callback({ generalData, versements });
  });
}
// Fonction pour générer le fichier XML
function generateXML(data, outputDir) {
  const { generalData, versements } = data;
  const xmlData = {
    declarationNonResidents: {
      identifiantFiscal: generalData.identifiantFiscal,
      annee: generalData.annee,
      periode: generalData.periode,
      regime: generalData.regime,
      nonResidents: {
        nonResident: versements.map((v) => ({
          nomPrenomOuRaisonSociale: v.nomPrenomOuRaisonSociale, // Nettoyage du texte
          adresseEtranger: v.adresseEtranger,
          nIdentificationFiscale: v.nIdentificationFiscale, // Nettoyage du texte
          natureOperation: v.natureOperation,
          datePaiement: v.datePaiement,
          baseImposableHT: v.baseImposableHT.toFixed(2), // Conversion en nombre
          taux: v.taux.toFixed(0),
          tvaExigible: v.tvaExigible.toFixed(2),
        })),
      },
    },
  };
  const builder = new xml2js.Builder({
    headless: false,
    renderOpts: { pretty: true },
  });
  const xmlContent = builder.buildObject(xmlData);
  const uuid = crypto.randomUUID();
  const fileName = `TvaEtranger_${uuid}.xml`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFile(filePath, xmlContent, (err) => {
    if (err) {
      logger.error("Erreur lors de la génération du fichier XML :", err); 
      alert("❌ Erreur lors de la génération du fichier XML :", err);
    } else {
      logger.info("Fichier XML généré avec succès :" +${filePath}); 
      alert(`✅ Fichier XML généré avec succès : ${filePath}`);
    }
  });
}
// Écouter l'événement 'file-opened' envoyé depuis main.js
document.getElementById("convertButtonType1").addEventListener("click", () => {
  ipcRenderer.on("file-opened", (event, filePath) => {
    alert("Fichier ouvert: " + filePath); // Afficher une alerte pour confirmer que le fichier a été ouvert
    readCSV(filePath, (data) => {
      const outputDir = path.dirname(filePath);
      generateXML(data, outputDir);
    });
  });
  // console.log('Convert button clicked'); // Log pour débogage
  const fileInput = document.getElementById("fileInputType1");
  if (fileInput.files.length === 0) {
    alert("Please select a CSV file first.");
    return;
  }
  const file = fileInput.files[0];
  if (!file) {
    alert("No file selected");
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    const csvData = e.target.result;
    // const filetrt = __dirname + '/indeclarations/' + file.name;
    const filetrt = "d:/dectva/in/" + file.name;
    // Passer les données CSV lues pour traitement
    readCSV(filetrt, (data) => {
      //  const outputDir = __dirname + '/outdeclarations/';
      const outputDir = "d:/dectva/out/";
      generateXML(data, outputDir);
    });
  };
  reader.readAsText(file);
});
