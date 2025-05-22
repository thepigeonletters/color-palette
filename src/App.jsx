import React, { useState, useRef, useEffect } from 'react';
import chroma from 'chroma-js';
import { Tabs } from "@headlessui/react";
import ColorThief from 'colorthief';

export default function ColorPaletteGenerator() {
  const [image, setImage] = useState(null);
  const [baseColors, setBaseColors] = useState([]);
  const [palette, setPalette] = useState([]);
  const [contrastPairs, setContrastPairs] = useState([]);
  const [suggestedColors, setSuggestedColors] = useState([]);
  const [suggestedNeutrals, setSuggestedNeutrals] = useState([]);
  const imageRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
    };
    if (file) reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (imageRef.current && image) {
      imageRef.current.onload = () => {
        const colorThief = new ColorThief();
        const img = imageRef.current;
        const colors = colorThief.getPalette(img, 5);
        const hexColors = colors.map(rgb => chroma(rgb).hex());
        setBaseColors(hexColors);
        generateSmartPalette(hexColors);
        generateSuggestedAddOns(hexColors);
        generateSuggestedNeutrals(hexColors);
      };
    }
  }, [image]);

  const generateSmartPalette = (colors) => {
    const extended = colors.flatMap((color) => [
      chroma(color).brighten(1).hex(),
      chroma(color).hex(),
      chroma(color).darken(1).hex(),
      chroma(color).set('hsl.h', "+30").hex(),
      chroma(color).set('hsl.h', "-30").hex()
    ]);

    const uniqueColors = [...new Set(extended)];
    const namedPalette = uniqueColors.map(hex => ({
      hex,
      name: nameColor(hex),
      contrastWithWhite: chroma.contrast(hex, 'white').toFixed(2),
      contrastWithBlack: chroma.contrast(hex, 'black').toFixed(2)
    }));
    setPalette(namedPalette);
    generateContrastPairs(namedPalette);
  };

  const generateSuggestedAddOns = (colors) => {
    const addOns = colors.flatMap(hex => {
      const base = chroma(hex);
      const suggestions = [
        base.set('hsl.h', '+180'), // complementary
        base.set('hsl.h', '+60'),  // triadic
        base.set('hsl.h', '-60')   // triadic
      ];

      return suggestions.map(s => {
        const contrastWhite = chroma.contrast(s, 'white');
        const contrastBlack = chroma.contrast(s, 'black');
        const adjusted = contrastWhite < 4.5 && contrastBlack < 4.5 ? s.darken(2) : s;

        return {
          base: hex,
          suggested: adjusted.hex(),
          name: nameColor(adjusted.hex()),
          contrastWithWhite: contrastWhite.toFixed(2),
          contrastWithBlack: contrastBlack.toFixed(2)
        };
      });
    });

    setSuggestedColors(addOns);
  };

  const generateSuggestedNeutrals = (colors) => {
    const lightNeutral = chroma.average(colors, 'lab').brighten(3).desaturate(2).hex();
    const darkNeutral = chroma.average(colors, 'lab').darken(3).desaturate(2).hex();

    setSuggestedNeutrals([
      {
        hex: lightNeutral,
        label: 'Suggested Light Neutral',
        name: nameColor(lightNeutral),
        contrast: baseColors.map(c => ({ color: c, ratio: chroma.contrast(lightNeutral, c).toFixed(2) }))
      },
      {
        hex: darkNeutral,
        label: 'Suggested Dark Neutral',
        name: nameColor(darkNeutral),
        contrast: baseColors.map(c => ({ color: c, ratio: chroma.contrast(darkNeutral, c).toFixed(2) }))
      }
    ]);
  };

  const generateContrastPairs = (colors) => {
    const pairs = [];
    for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < colors.length; j++) {
        if (i !== j) {
          const contrast = chroma.contrast(colors[i].hex, colors[j].hex);
          pairs.push({
            text: colors[i],
            background: colors[j],
            contrast: contrast.toFixed(2),
            accessible: contrast >= 4.5 ? '✅ AA' : contrast >= 3 ? '⚠️ AA Large' : '❌'
          });
        }
      }
    }
    setContrastPairs(pairs);
  };

  const nameColor = (hex) => {
    const hue = chroma(hex).get('hsl.h');
    const lightness = chroma(hex).get('lab.l');
    if (lightness > 80) return 'Very Light ' + getHueName(hue);
    if (lightness < 30) return 'Dark ' + getHueName(hue);
    return getHueName(hue);
  };

  const getHueName = (hue) => {
    if (hue < 30 || hue >= 330) return 'Red';
    if (hue < 60) return 'Orange';
    if (hue < 90) return 'Yellow';
    if (hue < 150) return 'Green';
    if (hue < 210) return 'Cyan';
    if (hue < 270) return 'Blue';
    if (hue < 330) return 'Purple';
    return 'Color';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto font-[Inter] bg-neutral-50 min-h-screen">
      <h1 className="text-4xl font-bold mb-6 text-center text-neutral-800">🎨 Smart Color Palette Generator</h1>

      <input type="file" onChange={handleImageUpload} accept="image/*" className="mb-6 block mx-auto" />

      {image && (
        <img
          src={image}
          alt="Uploaded"
          ref={imageRef}
          crossOrigin="anonymous"
          className="w-full max-h-96 object-contain mb-8 rounded-2xl shadow"
        />
      )}

      <Tabs>
        <Tabs.List className="flex space-x-4 justify-center mb-6">
          {['Palette', 'Contrast Matrix', 'Suggested Add-Ons'].map((tab, idx) => (
            <Tabs.Tab key={idx} className={({ selected }) =>
              selected
                ? 'px-4 py-2 text-white bg-neutral-800 rounded-lg shadow-md'
                : 'px-4 py-2 text-neutral-700 bg-neutral-200 rounded-lg hover:bg-neutral-300 transition'
            }>
              {tab}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Tabs.Panel>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-10">
            {palette.map((color, i) => (
              <div
                key={i}
                className="rounded-2xl shadow-lg p-4 flex flex-col justify-between transition transform hover:scale-105 duration-300 ease-in-out"
                style={{ backgroundColor: color.hex }}
              >
                <p className="text-white font-semibold text-center text-lg drop-shadow mb-2">{color.name}</p>
                <p className="text-white text-center text-sm drop-shadow">{color.hex}</p>
                <p className="text-white text-center text-xs mt-1 drop-shadow">Contrast (White): {color.contrastWithWhite}</p>
                <p className="text-white text-center text-xs drop-shadow">Contrast (Black): {color.contrastWithBlack}</p>
              </div>
            ))}
          </div>
        </Tabs.Panel>

        <Tabs.Panel>
          {contrastPairs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contrastPairs.map((pair, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl shadow border transition hover:shadow-lg"
                  style={{ backgroundColor: pair.background.hex }}
                >
                  <p
                    className="text-sm font-semibold"
                    style={{ color: pair.text.hex }}
                  >
                    Text: {pair.text.name} on {pair.background.name}
                  </p>
                  <p className="text-sm">Contrast: {pair.contrast} {pair.accessible}</p>
                </div>
              ))}
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-10">
            {suggestedColors.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl shadow-lg p-4 flex flex-col justify-between transition transform hover:scale-105 duration-300 ease-in-out"
                style={{ backgroundColor: s.suggested }}
              >
                <p className="text-white font-semibold text-center text-lg drop-shadow mb-2">Suggested for {nameColor(s.base)}</p>
                <p className="text-white text-center text-sm drop-shadow">{s.suggested}</p>
                <p className="text-white text-center text-xs drop-shadow">{s.name}</p>
                <p className="text-white text-center text-xs drop-shadow">Contrast: W:{s.contrastWithWhite} / B:{s.contrastWithBlack}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Suggested Neutrals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {suggestedNeutrals.map((neutral, idx) => (
                <div
                  key={idx}
                  className="rounded-xl p-4 shadow-md"
                  style={{ backgroundColor: neutral.hex }}
                >
                  <p className="text-white font-bold text-lg text-center drop-shadow mb-2">{neutral.label}</p>
                  <p className="text-white text-center text-sm drop-shadow">{neutral.name} ({neutral.hex})</p>
                  <ul className="text-white text-xs mt-2">
                    {neutral.contrast.map((c, i) => (
                      <li key={i} className="drop-shadow">Contrast with {nameColor(c.color)}: {c.ratio}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
