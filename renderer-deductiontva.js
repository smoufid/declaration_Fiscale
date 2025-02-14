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
    new winston.transports.File({ filename: "log/log-deductionTva.log" }),
  ],
});
function cleanText(text) {
  return text.replace(/[^\w\s]/gi, "");
}
function getModePaiementCode(mode) {
  const modeMapping = {
    ES: "1", // Espèces
    CH: "2", // Chèque
    PR: "3", // Prélèvement
    VB: "4", // Virement bancaire
    TR: "5", // Traite
    CO: "6", // Compensation
  };
  return modeMapping[mode] || "7"; // Retourne '7' si le mode n'est pas reconnu
}
function formatDate(dateStr) {
  const [day, month, year] = dateStr.split("/");
  const date = new Date(year, month - 1, day); // Les mois commencent à 0 dans l'objet Date
  const formattedDate = date.toISOString().split("T")[0];
  return formattedDate;
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
          try {
            generalData = {
              identifiantFiscal: parts[1],
              annee: parts[2],
              periode: parts[3],
              regime: parts[4],
            };
          } catch (error) {
            const fieldName = [
              "identifiantFiscal",
              "annee",
              "periode",
              "regime",
            ][index];
            logger.error(
              `Erreur lors de l'analyse du champ ${fieldName} à la ligne ${
                index + 1
              } :`,
              fieldErr
            );
            alert(
              `❌ Erreur lors de l'analyse du champ ${fieldName} à la ligne ${
                index + 1
              } : ${fieldErr.message}`
            );
            return;
          }
        } else if (parts[0] === "D") {
          try {
            versements.push({
              ord: cleanText(parts[1]),
              num: cleanText(parts[2]),
              des: cleanText(parts[3]),
              mht: parseFloat(cleanText(parts[4]).replace(",", ".")),
              tva: parseFloat(cleanText(parts[5]).replace(",", ".")), // Nettoyage du texte
              ttc: parseFloat(cleanText(parts[6]).replace(",", ".")),
              if: parts[7].trim(),
              nom: cleanText(parts[8].trim()),
              ice: parts[9].trim(),
              tx: parseFloat(
                parts[10].replace("%", "").trim().replace(",", ".")
              ),
              mp: getModePaiementCode(parts[11].trim()),
              dpai: formatDate(parts[12].trim()),
              dfac: formatDate(parts[13].trim()),
              tvaCorrespondante: parseFloat(parts[4].replace(",", ".")),
            });
          } catch (fieldErr) {
            const fieldName = [
              "ord",
              "num",
              "des",
              "mht",
              "tva",
              "ttc",
              "if",
              "nom",
              "ice",
              "tx",
              "mp",
              "dpai",
              "dfac",
            ][index];
            logger.error(
              `Erreur lors de l'analyse du champ ${fieldName} à la ligne ${
                index + 1
              } :`,
              fieldErr
            );
            alert(
              `❌ Erreur lors de l'analyse du champ ${fieldName} à la ligne ${
                index + 1
              } : ${fieldErr.message}`
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
function generateXML(data, outputDir) {
  const { generalData, versements } = data;
  const datesys = getFormattedDate();
  const xmlData = {
    DeclarationReleveDeduction: {
      identifiantFiscal: generalData.identifiantFiscal,
      annee: generalData.annee,
      periode: generalData.periode,
      regime: generalData.regime,
      releveDeductions: {
        rd: versements.map((v) => ({
          ord: v.ord,
          num: v.num,
          des: v.des,
          mht: v.mht.toFixed(2),
          tva: v.tva.toFixed(2),
          ttc: v.ttc.toFixed(2),
          refF: {
            if: v.if,
            nom: v.nom.trim(),
            ice: v.ice.trim(),
          },
          tx: v.tx.toFixed(2),
          mp: {
            id: v.mp,
          },
          dpai: v.dpai,
          dfac: v.dfac,
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
  const fileName = `DEDUCTION_TVA_${uuid}.xml`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFile(filePath, xmlContent, (err) => {
    if (err) {
      alert("❌ Erreur lors de la génération du fichier XML :", err);
    } else {
      alert(`✅ Fichier XML généré avec succès : ${filePath}`);
    }
  });
}
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
    const filetrt = "d:/dectva/in/" + file.name;
    readCSV(filetrt, (data) => {
      const outputDir = "d:/dectva/out/";
      generateXML(data, outputDir);
    });
  };
  reader.readAsText(file);
});
