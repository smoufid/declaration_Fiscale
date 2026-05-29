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
    }),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "log/log-facturesretards.log" }),
  ],
});
function cleanText(text) {
  return text.replace(/[^\w\s]/gi, "");
}
function formatDate(dateStr) {
  if (!dateStr || dateStr.trim() === "") {
    return "";
  }
  const [day, month, year] = dateStr.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
function getFormattedDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Mois commence à 0
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

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
      const lines = data
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
      let generalData = {};
      let versements = [];

      lines.forEach((line, index) => {
        const parts = line.split(";").map((part) => part.trim());

        if (parts[0] === "E") {
          logger.info("Ligne E : " + JSON.stringify(parts, null, 2));
          generalData = {
            identifiantFiscal: parts[3],
            annee: parts[1],
            periode: parts[2],
            activite: "1",
            chiffreAffaire: parseFloat(parts[5].replace(",", ".")),
          };
        } else if (parts[0] === "D") {
          try {
            logger.info("Ligne D : " + JSON.stringify(parts, null, 2));
            versements.push({
              identifiantFiscal: cleanText(parts[1]), // Nettoyage du texte
              numRC: cleanText(parts[4]),
              adresse: cleanText(parts[5]),
              numFacture: parts[7], // Nettoyage du texte
              dateEmission: formatDate(parts[8]),
              natureMarchandise: cleanText(parts[9]),
              dateLivraisonMarchandise: formatDate(parts[13]),
              moisTransaction: parts[11],
              annee: parts[12],
              dateConstatation: formatDate(parts[13]),
              datePrevuePaiement: formatDate(parts[14]),
              dateConvenuePaiementFacture: formatDate(parts[15]),
              delaiPaiementSecteurActivite: parts[16],
              datePrevueSelonDelaiFixeSecteur: formatDate(parts[17]),
              montantFactureTtc: parseFloat(parts[18].replace(",", ".")), // Conversion en nombre
              montantNonEncorePaye: parseFloat(parts[19].replace(",", ".")), // Conversion en nombre
              montantPayeHorsDelai: parseFloat(parts[21].replace(",", ".")), // Conversion en nombre
              datePaiementHorsDelai: formatDate(parts[22]),
              montantObjetDeLitige: parseFloat(parts[24].replace(",", ".")), // Conversion en nombre
              dateRecoursJudiciaire: formatDate(parts[25]),
              montantApresJugement: parseFloat(parts[26].replace(",", ".")), // Conversion en nombre
              dateJugementDefinitif: formatDate(parts[27]),
              modePaiement: cleanText(parts[29]),
              referencePaiement: parts[30],
            });
          } catch (fieldErr) {
            const fieldName = [
              "identifiantFiscal",
              "numRC",
              "adresse",
              "numFacture",
              "dateEmission",
              "natureMarchandise",
              "dateLivraisonMarchandise",
              "datePrevuePaiement",
              "montantFactureTtc",
              "montantNonEncorePaye",
              "montantPayeHorsDelai",
              "datePaiementHorsDelai",
              "modePaiement",
              "referencePaiement",
            ][index];
            logger.error(
              `❌ Erreur lors de l'analyse du champ ${fieldName} à la ligne ${index + 1} :`,
              fieldErr,
            );
            alert(
              `❌ Erreur lors de l'analyse du champ ${fieldName} à la ligne ${index + 1} : ${fieldErr.message}`,
            );
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
  const datesys = getFormattedDate();

  const xmlData = {
    DeclarationDelaiPaiement: {
      identifiantFiscal: generalData.identifiantFiscal,
      annee: generalData.annee,
      periode: generalData.periode,
      activite: generalData.activite,
      chiffreAffaire: generalData.chiffreAffaire.toFixed(2),
      listeFacturesHorsDelai: {
        FactureHorsDelai: versements.map((v) => ({
          identifiantFiscal: v.identifiantFiscal,
          numRC: v.numRC,
          adresseSiegeSocial: v.adresse,
          numFacture: v.numFacture,
          dateEmission: v.dateEmission,
          natureMarchandise: v.natureMarchandise,
          dateLivraisonMarchandise: v.dateLivraisonMarchandise,
          ...(v.moisTransaction
            ? { moisTransaction: v.moisTransaction }
            : {}),
          ...(v.annee
            ? { annee: v.annee }
            : {}),
          dateConstatation: v.dateConstatation,
          datePrevuePaiement: v.datePrevuePaiement,
          ...(v.dateConvenuePaiementFacture
            ? { dateConvenuePaiementFacture: v.dateConvenuePaiementFacture }
            : {}),

            ...(v.delaiPaiementSecteurActivite
            ? { delaiPaiementSecteurActivite: v.delaiPaiementSecteurActivite }
            : {}),
          ...(v.datePrevueSelonDelaiFixeSecteur
            ? { datePrevueSelonDelaiFixeSecteur: v.datePrevueSelonDelaiFixeSecteur }
            : {}),
          montantFactureTtc: v.montantFactureTtc.toFixed(2),
          montantNonEncorePaye: v.montantNonEncorePaye.toFixed(2),
          montantPayeHorsDelai: v.montantPayeHorsDelai.toFixed(2),
          ...(v.datePaiementHorsDelai
            ? { datePaiementHorsDelai: v.datePaiementHorsDelai }
            : {}),
          ...(v.montantObjetDeLitige != 0
            ? { montantObjetDeLitige: v.montantObjetDeLitige.toFixed(2) }
            : {}),
          ...(v.dateRecoursJudiciaire
            ? { dateRecoursJudiciaire: v.dateRecoursJudiciaire }
            : {}),
          ...(v.montantApresJugement != 0
            ? { montantApresJugement: v.montantApresJugement.toFixed(2) }
            : {}),
          ...(v.dateJugementDefinitif
            ? { dateJugementDefinitif: v.dateJugementDefinitif }
            : {}),
          modePaiement: v.modePaiement,
          referencePaiement: v.referencePaiement,
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
  const fileName = `RS_FINALE_Factures_Hors_Delais_${uuid}.xml`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFile(filePath, xmlContent, (err) => {
    if (err) {
      logger.error(
        `❌ Erreur lors de la génération du fichier XML : ${err.message}`,
        err,
      );
      alert("❌ Erreur lors de la génération du fichier XML :", err);
    } else {
      logger.info(`Fichier XML généré avec succès: ${filePath}`);
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

  //alert('File selected: ' + file.name); // Afficher le nom du fichier

  const reader = new FileReader();
  reader.onload = function (e) {
    const csvData = e.target.result;
    //alert('CSV data loaded'); // Log pour débogage
    const filetrt = "d:/dectva/in/" + file.name;
    // Passer les données CSV lues pour traitement
    readCSV(filetrt, (data) => {
      const outputDir = "d:/dectva/out/";
      generateXML(data, outputDir);
    });
  };

  reader.readAsText(file);
});
