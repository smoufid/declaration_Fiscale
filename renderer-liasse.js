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
    new winston.transports.File({ filename: "log/log-liassefiscale.log" }),
  ],
});
function cleanText(text) {
  return text.replace(/[^\w\s]/gi, "");
}
function recupererElementsTableauNouvelle(lines, indices, soustractionIndex, debutLigne) {
  let tableau2 = [];
  logger.info("🔹 Données reçues (Tableaux ) :", JSON.stringify(debutLigne, null, 2));

  if (!Array.isArray(lines) || lines.length === 0) {
    logger.warn("⚠ Aucune donnée dans 'lines', tableau1 sera vide.");
    return tableau2;
  }
  logger.info("🔹 Données reçues (lines) :", JSON.stringify(lines, null, 2));
  lines.forEach((line, lineIndex) => {
    let parts = line.split(';').map(p => p.trim()); // Nettoyer les espaces
    logger.info(`📌 Ligne ${lineIndex} après split :`, JSON.stringify(parts, null, 2));
    if (parts[0].trim() === debutLigne) {
      let extracted = indices
        .map(index => {
          let indexSoustrait = index - soustractionIndex;
          if (parts[index] && parts[indexSoustrait]) {
            logger.info(`✅ Extraction réussie: codeEdi=${parts[index]}, valeur=${parts[indexSoustrait]}`);
            return { codeEdi: parts[index].trim(), valeur: (parts[indexSoustrait].trim()) || 0 };
          } else {
            logger.warn(`⚠ Indice manquant sur la ligne ${lineIndex}: ${JSON.stringify(parts)}`);
            return null;
          }
        })
        .filter(item => item !== null);

      if (extracted.length > 0) {
        tableau2.push(extracted);
      }
    }
  });
  logger.info("✅ tableau final :", JSON.stringify(tableau2, null, 2));
  return tableau2;
}


// function recupererElementsTableau34(lines) {
//   let tableau2 = [];

//   if (!Array.isArray(lines) || lines.length === 0) {
//     logger.warn("⚠ Aucune donnée dans 'lines', tableau2 sera vide.");
//     return tableau2;
//   }

//   logger.info("🔹 Données reçues (Tableaux 34) :", JSON.stringify(lines, null, 2));

//   lines.forEach((line, lineIndex) => {
//     let parts = line.split(';').map(p => p.trim()); // Nettoyer les espaces
//     logger.info(`📌 Ligne ${lineIndex} après split :`, JSON.stringify(parts, null, 2));

//     if (parts[0] === '34') {
//       let indices = [4,5]; // Indices des valeurs
//       let extracted = indices
//         .map(index => {
//           let indexMinus4 = index - 2;
//           if (parts[index] && parts[indexMinus4]) {
//             logger.info(`✅ Extraction réussie: codeEdi=${parts[index]}, valeur=${parts[indexMinus4]}`);
//             return { codeEdi: parts[index], valeur: parseFloat(parts[indexMinus4]) || 0 };
//           } else {
//             logger.warn(`⚠ Indice manquant sur la ligne ${lineIndex}: ${JSON.stringify(parts)}`);
//             return null;
//           }
//         })
//         .filter(item => item !== null);

//       if (extracted.length > 0) {
//         tableau2.push(extracted);
//       }
//     }
//   });

//   logger.info("✅ tableau34 final :", JSON.stringify(tableau2, null, 2));
//   return tableau2;
// }
// function recupererElementsTableau2(lines) {
//   let tableau2 = [];

//   if (!Array.isArray(lines) || lines.length === 0) {
//     logger.warn("⚠ Aucune donnée dans 'lines', tableau2 sera vide.");
//     return tableau2;
//   }

//   logger.info("🔹 Données reçues (Tableaux 2) :", JSON.stringify(lines, null, 2));

//   lines.forEach((line, lineIndex) => {
//     let parts = line.split(';').map(p => p.trim()); // Nettoyer les espaces
//     logger.info(`📌 Ligne ${lineIndex} après split :`, JSON.stringify(parts, null, 2));

//     if (parts.length < 10) {
//       logger.warn(`⚠ Ligne ignorée (trop courte) : ${JSON.stringify(parts)}`);
//       return; // Ignore les lignes trop courtes
//     }

//     if (parts[0] === '2') {
//       let indices = [6, 7, 8, 9]; // Indices des valeurs
//       let extracted = indices
//         .map(index => {
//           let indexMinus4 = index - 4;
//           if (parts[index] && parts[indexMinus4]) {
//             logger.info(`✅ Extraction réussie: codeEdi=${parts[index]}, valeur=${parts[indexMinus4]}`);
//             return { codeEdi: parts[index], valeur: parseFloat(parts[indexMinus4]) || 0 };
//           } else {
//             logger.warn(`⚠ Indice manquant sur la ligne ${lineIndex}: ${JSON.stringify(parts)}`);
//             return null;
//           }
//         })
//         .filter(item => item !== null);

//       if (extracted.length > 0) {
//         tableau2.push(extracted);
//       }
//     }
//   });

//   logger.info("✅ tableau2 final :", JSON.stringify(tableau2, null, 2));
//   return tableau2;
// }

// function recupererElementsTableau32(lines) {
//   let tableau2 = [];

//   if (!Array.isArray(lines) || lines.length === 0) {
//     logger.warn("⚠ Aucune donnée dans 'lines', tableau2 sera vide.");
//     return tableau2;
//   }

//   logger.info("🔹 Données reçues (Tableaux 32) :", JSON.stringify(lines, null, 2));

//   lines.forEach((line, lineIndex) => {
//     let parts = line.split(';').map(p => p.trim()); // Nettoyer les espaces
//     logger.info(`📌 Ligne ${lineIndex} après split :`, JSON.stringify(parts, null, 2));

     

//     if (parts[0] === '32') {
//       let indices = [4,5]; // Indices des valeurs
//       let extracted = indices
//         .map(index => {
//           let indexMinus4 = index - 2;
//           if (parts[index] && parts[indexMinus4]) {
//             logger.info(`✅ Extraction réussie: codeEdi=${parts[index]}, valeur=${parts[indexMinus4]}`);
//             return { codeEdi: parts[index], valeur: parseFloat(parts[indexMinus4]) || 0 };
//           } else {
//             logger.warn(`⚠ Indice manquant sur la ligne ${lineIndex}: ${JSON.stringify(parts)}`);
//             return null;
//           }
//         })
//         .filter(item => item !== null);

//       if (extracted.length > 0) {
//         tableau2.push(extracted);
//       }
//     }
//   });

//   logger.info("✅ tableau2 final :", JSON.stringify(tableau2, null, 2));
//   return tableau2;
// }



// function recupererElementsTableau24(lines) {
//   let tableau2 = [];

//   if (!Array.isArray(lines) || lines.length === 0) {
//     logger.warn("⚠ Aucune donnée dans 'lines', tableau24 sera vide.");
//     return tableau2;
//   }

//   logger.info("🔹 Données reçues (Tableaux 24) :", JSON.stringify(lines, null, 2));

//   lines.forEach((line, lineIndex) => {
//     let parts = line.split(';').map(p => p.trim()); // Nettoyer les espaces
//     logger.info(`📌 Ligne ${lineIndex} après split :`, JSON.stringify(parts, null, 2));

//     if (parts.length < 10) {
//       logger.warn(`⚠ Ligne ignorée (trop courte) : ${JSON.stringify(parts)}`);
//       return; // Ignore les lignes trop courtes
//     }

//     if (parts[0] === '24') {
//       let indices = [10,11,12,13,14,15,16,17]; // Indices des valeurs
//       let extracted = indices
//         .map(index => {
//           let indexMinus4 = index - 8;
//           if (parts[index] && parts[indexMinus4]) {
//             logger.info(`✅ Extraction réussie: codeEdi=${parts[index]}, valeur=${parts[indexMinus4]}`);
//             return { codeEdi: parts[index], valeur: parseFloat(parts[indexMinus4]) || 0 };
//           } else {
//             logger.warn(`⚠ Indice manquant sur la ligne ${lineIndex}: ${JSON.stringify(parts)}`);
//             return null;
//           }
//         })
//         .filter(item => item !== null);

//       if (extracted.length > 0) {
//         tableau2.push(extracted);
//       }
//     }
//   });

//   logger.info("✅ tableau2 final :", JSON.stringify(tableau2, null, 2));
//   return tableau2;
// }

function recupererElementsTableau7Nouvelle(lines, indices, soustractionIndex, indexNumeroLigne, numeroTableau) {
  let tableau2 = [];
  let numeroLigne = 1; // Initialisation du compteur
  if (!Array.isArray(lines) || lines.length === 0) {
    logger.warn("⚠ Aucune donnée dans 'lines', tableau7 sera vide.");
    return tableau2;
  }
  logger.info("🔹 Données reçues (Tableaux ) :", JSON.stringify(numeroTableau, null, 2));
  lines.forEach((line, lineIndex) => {
    let parts = line.split(';').map(p => p.trim()); // Nettoyer les espaces
    logger.info(`📌 Ligne ${lineIndex} après split :`, JSON.stringify(parts, null, 2));
    if (parts[0] === numeroTableau) {
      let extracted = indices
        .map(index => {
          let indexSoustrait = index - soustractionIndex;
          if (parts[index] && parts[indexSoustrait] && parts[index] !== '0') {
            logger.info(`✅ Extraction réussie: codeEdi=${parts[index]}, valeur=${parts[indexSoustrait]}`);
            return { numeroLigne: parts[indexNumeroLigne], codeEdi: parts[index], valeur: parts[indexSoustrait] || '' };
          } else {
            logger.warn(`⚠ Indice manquant sur la ligne ${lineIndex}: ${JSON.stringify(parts)}`);
            return null;
          }
        })
        .filter(item => item !== null);
      if (extracted.length > 0) {
        tableau2.push(extracted);
        numeroLigne++;
      }
    }
  });
  logger.info("✅ tableau2 final :", JSON.stringify(tableau2, null, 2));
  return tableau2;
}


// function recupererElementsTableau7(lines) {
//   let tableau2 = [];
//   let numeroLigne = 1; // Initialisation du compteur
//   if (!Array.isArray(lines) || lines.length === 0) {
//     logger.warn("⚠ Aucune donnée dans 'lines', tableau7 sera vide.");
//     return tableau2;
//   }
//   logger.info("🔹 Données reçues (Tableaux ) :", JSON.stringify(lines, null, 2));
//   lines.forEach((line, lineIndex) => {
//     let parts = line.split(';').map(p => p.trim()); // Nettoyer les espaces
//     logger.info(`📌 Ligne ${lineIndex} après split :`, JSON.stringify(parts, null, 2));
//     if (parts[0] === '7') {
//       let indices = [4,5,6]; // Indices des valeurs
//       let extracted = indices
//         .map(index => {
//           let indexMinus4 = index - 3;
//           if (parts[index] && parts[indexMinus4] && parts[index] !== '0' ) {
//             logger.info(`✅ Extraction réussie: codeEdi=${parts[index]}, valeur=${parts[indexMinus4]}`);
//             return { numeroLigne: parts[7],codeEdi: parts[index], valeur: parts[indexMinus4]   || '' };
//           } else {
//             logger.warn(`⚠ Indice manquant sur la ligne ${lineIndex}: ${JSON.stringify(parts)}`);
//             return null;
//           }
//         })
//         .filter(item => item !== null);
//       if (extracted.length > 0) {
//         tableau2.push(extracted);
//         numeroLigne++;
//       }
//     }
//   });
//   logger.info("✅ tableau2 final :", JSON.stringify(tableau2, null, 2));
//   return tableau2;
// }

// function recupererElementsTableau6(lines) {
//   let tableau2 = [];

//   if (!Array.isArray(lines) || lines.length === 0) {
//     logger.warn("⚠ Aucune donnée dans 'lines', tableau6 sera vide.");
//     return tableau2;
//   }

//   logger.info("🔹 Données reçues (Tableaux 6) :", JSON.stringify(lines, null, 2));

//   lines.forEach((line, lineIndex) => {
//     let parts = line.split(';').map(p => p.trim()); // Nettoyer les espaces
//     logger.info(`📌 Ligne ${lineIndex} après split :`, JSON.stringify(parts, null, 2));

//     if (parts.length < 10) {
//       logger.warn(`⚠ Ligne ignorée (trop courte) : ${JSON.stringify(parts)}`);
//       return; // Ignore les lignes trop courtes
//     }

//     if (parts[0] === '6') {
//       let indices = [6, 7, 8, 9]; // Indices des valeurs
//       let extracted = indices
//         .map(index => {
//           let indexMinus4 = index - 4;
//           if (parts[index] && parts[indexMinus4]) {
//             logger.info(`✅ Extraction réussie: codeEdi=${parts[index]}, valeur=${parts[indexMinus4]}`);
//             return { codeEdi: parts[index], valeur: parseFloat(parts[indexMinus4]) || 0 };
//           } else {
//             logger.warn(`⚠ Indice manquant sur la ligne ${lineIndex}: ${JSON.stringify(parts)}`);
//             return null;
//           }
//         })
//         .filter(item => item !== null);

//       if (extracted.length > 0) {
//         tableau2.push(extracted);
//       }
//     }
//   });

//   logger.info("✅ tableau6 final :", JSON.stringify(tableau2, null, 2));
//   return tableau2;
// }



// function recupererElementsTableau1(lines) {
//   let tableau2 = [];
// logger.info("🔹 Données reçues (Tableaux 1) :", JSON.stringify(lines, null, 2));
//   if (!Array.isArray(lines) || lines.length === 0) {
//     logger.warn("⚠ Aucune donnée dans 'lines', tableau1 sera vide.");
//     return tableau2;
//   }

//   logger.info("🔹 Données reçues (lines) :", JSON.stringify(lines, null, 2));

//   lines.forEach((line, lineIndex) => {
//     let parts = line.split(';').map(p => p.trim()); // Nettoyer les espaces
//     logger.info(`📌 Ligne ${lineIndex} après split :`, JSON.stringify(parts, null, 2));

//     if (parts.length < 6) {
//       logger.warn(`⚠ Ligne ignorée (trop courte) : ${JSON.stringify(parts)}`);
//       return; // Ignore les lignes trop courtes
//     }

//     if (parts[0].trim() === '1') {
//       let indices = [4,5]; // Indices des valeurs
//       let extracted = indices
//         .map(index => {
//           let indexMinus4 = index - 2;
//           if (parts[index] && parts[indexMinus4]) {
//             logger.info(`✅ Extraction réussie: codeEdi=${parts[index]}, valeur=${parts[indexMinus4]}`);
//             return { codeEdi: parts[index].trim(), valeur: parseFloat(parts[indexMinus4].trim()) || 0 };
//           } else {
//             logger.warn(`⚠ Indice manquant sur la ligne ${lineIndex}: ${JSON.stringify(parts)}`);
//             return null;
//           }
//         })
//         .filter(item => item !== null);

//       if (extracted.length > 0) {
//         tableau2.push(extracted);
//       }
//     }
//   });

//   logger.info("✅ tableau2 final :", JSON.stringify(tableau2, null, 2));
//   return tableau2;
// }
// Fonction pour lire le fichier CSV
function readCSV(filePath, callback) {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("❌ Erreur de lecture du fichier CSV :", err);
      return callback(null, err);
    }

    const lines = data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");

    let generalData = {};
    let tableaux2 = [];
    let tableaux1 = [];
    let tableaux6 = [];
    let tableaux7 = [];
    let tableaux24 = [];
    let tableaux24_1 = [];
    let tableaux32 = [];
    let tableaux34 = [];
    let tableaux23 = [];
    let tableaux37 = [];
    let tableaux38 = [];
    let tableaux39 = [];
    let tableaux40 = [];
    let tableaux41 = [];
    let tableaux5 = [];
    let tableaux12 = [];
    let tableaux26=[];
    let tableaux27=[];
    let tableaux28=[];
    let tableaux36=[];
    let tableaux200=[];
    let tableaux201=[];
    let tableaux202=[];
    let tableaux203=[];
    let tableaux220=[];
    let tableaux240=[];
    let indices = [4, 5];
    let soustractionIndex = 2;
     tableaux1=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("1")), indices, soustractionIndex, "1");
     tableaux34=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("34")), indices, soustractionIndex, "34");
     tableaux32=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("32")), indices, soustractionIndex, "32");
    indices=[6,7,8,9];
  soustractionIndex=4;
   tableaux2=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("2")), indices, soustractionIndex, "2");
    tableaux6=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("6")), indices, soustractionIndex, "6");
     indices=[10,11,12,13,14,15,16,17];
    soustractionIndex=8;
    tableaux24=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("24")), indices, soustractionIndex, "24");
     indices=[6,7,8,9];
    soustractionIndex=4;
     tableaux24=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("24")), indices, soustractionIndex, "24");
     tableaux24.push(...tableaux24_1);
    indices=[10,11,12,13,14,15,16,17];
     soustractionIndex=8;
     tableaux37=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("37")), indices, soustractionIndex, "37");
     indices=[6,7,8,9];
     soustractionIndex=4;
     tableaux40=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("40")), indices, soustractionIndex, "40");
   
     indices=[3];
     soustractionIndex=1;
     tableaux5=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("5")), indices, soustractionIndex, "5");
   
    indices=[10,11,12,13,14,15,16,17];
     soustractionIndex=8;
     tableaux26=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("26")), indices, soustractionIndex, "26");

  indices=[9,10,11,12,13,14,15];
     soustractionIndex=7;
     tableaux36=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("36")), indices, soustractionIndex, "36");

     indices=[4,5];
     soustractionIndex=2;
     tableaux200=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("200")), indices, soustractionIndex, "200");
    
     indices=[4,5];
    soustractionIndex=2;
     tableaux202=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("202")), indices, soustractionIndex, "202");
     indices=[6,7,8,9];
    soustractionIndex=4;
    tableaux203=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("203")), indices, soustractionIndex, "203");
    
    indices=[3];
    soustractionIndex=1;
     tableaux220=recupererElementsTableauNouvelle(lines.filter((line) => line.trim().startsWith("220")), indices, soustractionIndex, "220");
    
     /*tableaux 7*/
     indices = [4, 5, 6];
    soustractionIndex = 3;
    let indexNumeroLigne = 7;
     let numeroTableau = "7";
 tableaux7=recupererElementsTableau7Nouvelle(  lines.filter((line) => line.trim().startsWith("7")), indices, soustractionIndex, indexNumeroLigne, numeroTableau);
       indices = [12,13,14,15,16,17,18,19,20,21,22];
       soustractionIndex = 11;
       indexNumeroLigne = 23;
       numeroTableau = "23";
       tableaux23=recupererElementsTableau7Nouvelle(  lines.filter((line) => line.trim().startsWith("23")), indices, soustractionIndex, indexNumeroLigne, numeroTableau);
    
      indices = [9,10,11,12,13,14,15,16];
       soustractionIndex = 8;
      indexNumeroLigne = 17;
       numeroTableau = "38";
       tableaux38=recupererElementsTableau7Nouvelle(  lines.filter((line) => line.trim().startsWith("38")), indices, soustractionIndex, indexNumeroLigne, numeroTableau);
    
       indices = [12,13,14,15,16,17,18,19,20,21,22];
       soustractionIndex = 11;
       indexNumeroLigne = 23;
      numeroTableau = "39";
      tableaux39=recupererElementsTableau7Nouvelle(  lines.filter((line) => line.trim().startsWith("39")), indices, soustractionIndex, indexNumeroLigne, numeroTableau);

       indices = [13,14,15,16,17,19,20,21,22,23,24];
      soustractionIndex = 12;
       indexNumeroLigne = 25;
       numeroTableau = "41";
       tableaux41=recupererElementsTableau7Nouvelle(  lines.filter((line) => line.trim().startsWith("41")), indices, soustractionIndex, indexNumeroLigne, numeroTableau);

       indices = [11,12,13,14,15,16,17,18,19,20];
       soustractionIndex = 10;
      indexNumeroLigne = 21;
       numeroTableau = "12";
       tableaux12=recupererElementsTableau7Nouvelle(  lines.filter((line) => line.trim().startsWith("12")), indices, soustractionIndex, indexNumeroLigne, numeroTableau);

      indices = [16,17,18,19,20,21,22,23,24,25,26,27,28,29,30];
      soustractionIndex = 15;
      indexNumeroLigne = 31;
       numeroTableau = "27";
       tableaux27=recupererElementsTableau7Nouvelle(  lines.filter((line) => line.trim().startsWith("27")), indices, soustractionIndex, indexNumeroLigne, numeroTableau);

       indices = [14,15,16,17,18,19,20,21,22,23,24,25,26];
       soustractionIndex = 13;
       indexNumeroLigne = 27;
       numeroTableau = "28";
       tableaux28=recupererElementsTableau7Nouvelle(  lines.filter((line) => line.trim().startsWith("28")), indices, soustractionIndex, indexNumeroLigne, numeroTableau);
      indices = [4,5,6];
      soustractionIndex = 3;
       indexNumeroLigne = 7;
      numeroTableau = "201";
       tableaux201=recupererElementsTableau7Nouvelle(  lines.filter((line) => line.trim().startsWith("201")), indices, soustractionIndex, indexNumeroLigne, numeroTableau);


      indices = [3,4];
      soustractionIndex = 2;
       indexNumeroLigne = 5;
       numeroTableau = "240";
       tableaux240=recupererElementsTableau7Nouvelle(  lines.filter((line) => line.trim().startsWith("240")), indices, soustractionIndex, indexNumeroLigne, numeroTableau);


      lines.forEach((line) => {
      const parts = line.split(";").map((part) => part.trim());

      if (parts[0] === "E" && parts.length >= 4) {
        try {
          console.info("Ligne E :", JSON.stringify(parts, null, 2));

          generalData = {
            identifiantFiscal: parts[1],
            exerciceFiscalDu: parts[2],
            exerciceFiscalAu: parts[3],
            model: "1",
          };
        } catch (error) {
          alert(
            `❌ Erreur lors du traitement de la ligne : ${line}. Erreur: ${error.message}`
          );
        }
      }
    });

    callback({ generalData, tableaux2 ,tableaux1,tableaux6,tableaux7,tableaux24,tableaux32,tableaux34,tableaux23,tableaux37,tableaux38,tableaux39,tableaux40,tableaux41,tableaux5,tableaux12,tableaux26,tableaux27,tableaux28,tableaux36,tableaux200,tableaux201,tableaux202,tableaux203,tableaux220,tableaux240});
  });
}
// Fonction pour générer le fichier XML
function generateXML(data, outputDir) {
  const { generalData, tableaux2, tableaux1 ,tableaux6,tableaux7,tableaux24,tableaux32,tableaux34,tableaux23,tableaux37,tableaux38,tableaux39,tableaux40,tableaux41,tableaux5,tableaux12,tableaux26,tableaux27,tableaux28,tableaux36,tableaux200,tableaux201,tableaux202,tableaux203,tableaux220,tableaux240} = data;
logger.info('debut generation XML');
tableaux7.forEach(element => logger.info(JSON.stringify(element , null, 2)));
  // Fonction pour transformer un tableau en XML structuré
  const formatValeursTableau = (tableauId, data) => ({
      tableau: { id: tableauId },
      groupeValeurs: {
        ValeurCellule: data.flatMap(row =>
          row.map(({ codeEdi, valeur }) => ({
            cellule: { codeEdi },
            valeur:valeur,
          }))
        ),
      },
      extraFieldvaleurs:"",
    //},
  });
  const formatValeursTableau7 = (tableauId, data) => ({
    tableau: { id: tableauId },
    groupeValeurs: {
      ValeurCellule: data.flatMap(row =>
        row.map(({ numeroLigne, codeEdi, valeur }) => {
          let celluleObj = { cellule: { codeEdi }, valeur: valeur };
          if (numeroLigne !== '0') {
            celluleObj.numeroLigne = numeroLigne;
          }
          return celluleObj;
        })
      ),
    },
    extraFieldvaleurs:"",
});
  const xmlData = {
    Liasse: {
      modele: { id: generalData.model },
      resultatFiscal: {
        identifiantFiscal: generalData.identifiantFiscal,
        exerciceFiscalDu: generalData.exerciceFiscalDu,
        exerciceFiscalAu: generalData.exerciceFiscalAu,
      },
      groupeValeursTableau: {
        ValeursTableau: [
         formatValeursTableau("2", tableaux2), // Tableau ID 2
       formatValeursTableau("1", tableaux1), // Tableau ID 1
         formatValeursTableau("6", tableaux6), // Tableau ID 1
       formatValeursTableau7("7", tableaux7), // Tableau ID 1
       formatValeursTableau("24", tableaux24), // Tableau ID 1
        formatValeursTableau("32", tableaux32), // Tableau ID 1
         formatValeursTableau("34", tableaux34), // Tableau ID 1
         formatValeursTableau7("23", tableaux23), // Tableau ID 1
       formatValeursTableau("37", tableaux37), // Tableau ID 1
        formatValeursTableau7("38", tableaux38), // Tableau ID 1
        formatValeursTableau7("39", tableaux39), // Tableau ID 1
        formatValeursTableau("40", tableaux40), // Tableau ID 1
         formatValeursTableau7("41", tableaux41), // Tableau ID 1
         formatValeursTableau("5", tableaux5), // Tableau ID 1
         formatValeursTableau7("12", tableaux12), // Tableau ID 1
         formatValeursTableau("26", tableaux26), // Tableau ID 1
         formatValeursTableau7("27", tableaux27), // Tableau ID 1
         formatValeursTableau7("28", tableaux28), // Tableau ID 1
         formatValeursTableau("36", tableaux36), // Tableau ID 1
         formatValeursTableau("200", tableaux200), // Tableau ID 1
         formatValeursTableau7("201", tableaux201), // Tableau ID 1
         formatValeursTableau("202", tableaux202), // Tableau ID 1
         formatValeursTableau("203", tableaux203), // Tableau ID 1
         formatValeursTableau("220", tableaux220), // Tableau ID 1
        formatValeursTableau7("240", tableaux240), // Tableau ID 1

        ],
      },
    },
  };

  const builder = new xml2js.Builder({ headless: true, renderOpts: { pretty: true } });

  const xmlContent = builder.buildObject(xmlData);
  const uuid = crypto.randomUUID();
  const fileName = `LIASSE_FINALE_${uuid}.xml`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFile(filePath, xmlContent, (err) => {
    if (err) {
      alert("❌ Erreur lors de la génération du fichier XML :", err);
      console.error("❌ Erreur lors de la génération du fichier XML :", err);
    } else {
      alert(`✅ Fichier XML généré avec succès : ${filePath}`);
      console.log(`✅ Fichier XML généré avec succès : ${filePath}`);
    }
  });
}
 /*function generateXML(data, outputDir) {
  const { generalData, tableaux2,tableaux1 } = data;
  
  const xmlData = {
    Liasse: {
      modele: {
        id: generalData.model,
      },
      resultatFiscal: {
        identifiantFiscal: generalData.identifiantFiscal,
        exerciceFiscalDu: generalData.exerciceFiscalDu,
        exerciceFiscalAu: generalData.exerciceFiscalAu,
      },
      groupeValeursTableau: {
        ValeursTableau: {
          tableau: {
            id: "2",
          },
          
          groupeValeurs: {
            ValeurCellule: tableaux2.flatMap(row =>
              row.map(({ codeEdi, valeur }) => ({
                cellule: {
                  codeEdi: codeEdi,
                },
                valeur: valeur.toFixed(2),
              }))
            ),
          },
          extraFieldvaleurs:"",
        },
        ValeursTableau: {
          tableau: {
            id: "1",
          },
          
          groupeValeurs: {
            ValeurCellule: tableaux1.flatMap(row =>
              row.map(({ codeEdi, valeur }) => ({
                cellule: {
                  codeEdi: codeEdi,
                },
                valeur: valeur.toFixed(2),
              }))
            ),
          },
          extraFieldvaleurs:"",
        },
      },
    },
  };

  const builder = new xml2js.Builder({
    headless: false,
    renderOpts: { pretty: true },
  });

  const xmlContent = builder.buildObject(xmlData);
  const uuid = crypto.randomUUID();
  const fileName = `LIASSE_FINALE_${uuid}.xml`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFile(filePath, xmlContent, (err) => {
    if (err) {
      logger.error("❌ Erreur lors de la génération du fichier XML :", err);
      alert("❌ Erreur lors de la génération du fichier XML :", err);
    } else {
      alert(`✅ Fichier XML généré avec succès : ${filePath}`);
      logger.info(`✅ Fichier XML généré avec succès : ${filePath}`);
    }
 });
}*/

document.getElementById("convertButtonType1").addEventListener("click", () => {
  ipcRenderer.on("file-opened", (event, filePath) => {
    alert("Fichier ouvert: " + filePath); // Afficher une alerte pour confirmer que le fichier a été ouvert
    readCSV(filePath, (data) => {
      const outputDir = path.dirname(filePath);
      generateXML(data, outputDir);
    });
  });
  //  console.log('Convert button clicked'); // Log pour débogage
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
    readCSV(filetrt, (data) => {
      //   const outputDir = __dirname + '/outdeclarations/';
      const outputDir = "d:/dectva/out/";
      generateXML(data, outputDir);
    });
  };
  reader.readAsText(file);
});
