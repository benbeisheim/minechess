import { useState } from 'react';
import {
    Button,
    ColorPicker,
    ColorSlider,
    ColorSwatch,
    ColorThumb,
    Dialog,
    DialogTrigger,
    Label,
    ListBox,
    ListBoxItem,
    Popover,
    parseColor,
    Selection,
    SliderOutput,
    SliderTrack,
} from 'react-aria-components';
import './ReactAria.css'
import { BoardColorObj } from "../../types/chess";

interface TemplateColorProps {
  id: string,
  lightColor: string,
  darkColor: string,
}

const TemplateColor: React.FC<TemplateColorProps> = ({ id, lightColor, darkColor }) => {
  return (
    <ListBoxItem id={id} textValue={id} className='react-aria-ColorSwatchPickerItem'>
      <ColorSwatch color={parseColor(lightColor)}/>
      <ColorSwatch color={parseColor(darkColor)}/>
    </ListBoxItem>
  )
}

interface BoardColorProps {
    onChangeColor: (selectedColor: BoardColorObj) => void;
    selectedColor: BoardColorObj;
}

const BoardColor: React.FC<BoardColorProps> = ({ onChangeColor, selectedColor }) => {
    // Color Picker is set to Amber by default
    const [hueColor, setHueColor] = useState(parseColor('hsl(25, 100%, 50%)'));
    const [darkSlider, setDarkSlider] = useState(parseColor(selectedColor.dark));
    const [lightSlider, setLightSlider] = useState(parseColor(selectedColor.light));
    const [darkBoardColor, setDarkBoardColor] = useState(parseColor(selectedColor.dark));
    const [lightBoardColor, setLightBoardColor] = useState(parseColor(selectedColor.light));
    const [selectedTemplateColor, setSelectedTemplateColor] = useState<Selection>(new Set(['amber']))
    const [isPopoverOpen, setPopoverOpen] = useState(false);
    // 0 index is the light color and 1 index is the dark color
    const colorMap: Record<string, [string, string]> = {
        amber: ["hsl(25, 100%, 89%)", "hsl(25, 100%, 36%)"],
        gray: ["hsl(217, 21%, 96%)", "hsl(217, 21%, 27%)"],
        blue: ["hsl(193, 100%, 90%)", "hsl(193, 100%, 29%)"],
        green: ["hsl(86, 100%, 89%)", "hsl(86, 100%, 25%)"],
        purple: ["hsl(295, 100%, 95%)", "hsl(295, 100%, 36%)"],
    };

    return (
        <div>
            <ColorPicker defaultValue="#5100FF">
                <DialogTrigger>
                    <Button className="color-picker" onPress={() => setPopoverOpen(true)}>
                        <span style={{ paddingRight: 8 }} className='text-gray-800 dark:text-white'>Board Color</span>
                        <div>
                          <ColorSwatch color={parseColor(
                            `hsl(${darkBoardColor.hue}, ${darkBoardColor.saturation}%, ${darkBoardColor.lightness}%)`
                            )}/>
                            <ColorSwatch color={parseColor(
                              `hsl(${lightBoardColor.hue}, ${lightBoardColor.saturation}%, ${(lightBoardColor.lightness)}%)`
                            )}/>
                        </div>
                        <div>
                            <ColorSwatch color={parseColor(
                              `hsl(${lightBoardColor.hue}, ${lightBoardColor.saturation}%, ${(lightBoardColor.lightness)}%)`
                            )}/>
                            <ColorSwatch color={parseColor(
                              `hsl(${darkBoardColor.hue}, ${darkBoardColor.saturation}%, ${darkBoardColor.lightness}%)`
                            )}/>
                        </div>
                    </Button>
                    <Popover
                      placement="right"
                      isOpen={isPopoverOpen}
                      onOpenChange={(isOpen) => {
                        // Change everything back to whatever color setting is applied to the board
                        const currentDarkColor = parseColor(selectedColor.dark);
                        const currentLightColor = parseColor(selectedColor.light);
                        setHueColor(parseColor(
                          `hsl(${currentDarkColor.hue}, ${currentDarkColor.saturation}%, 50%)`
                        ));
                        setDarkSlider(parseColor(
                          `hsl(${currentDarkColor.hue}, ${currentDarkColor.saturation}%, ${currentDarkColor.lightness}%)`
                        ))
                        setDarkBoardColor(parseColor(
                          `hsl(${currentDarkColor.hue}, ${currentDarkColor.saturation}%, ${currentDarkColor.lightness}%)`
                        ))
                        setLightSlider(parseColor(
                          `hsl(${currentLightColor.hue}, ${currentLightColor.saturation}%, ${currentLightColor.lightness}%)`
                        ))
                        setLightBoardColor(parseColor(
                          `hsl(${currentLightColor.hue}, ${currentLightColor.saturation}%, ${currentLightColor.lightness}%)`
                        ))
                        // If current board color is set to a template that should be selected when the user reopens the popover
                        Object.keys(colorMap).map((color) => {
                          if (
                            colorMap[color][0] === selectedColor.light &&
                            colorMap[color][1] === selectedColor.dark
                          ) {
                            setSelectedTemplateColor(new Set([color]));
                          }
                        })
                        setPopoverOpen(isOpen);
                      }}
                    >
                        <Dialog 
                            className='color-picker-dialog'
                            style={{ background: window.matchMedia('(prefers-color-scheme: dark)').matches ? "#1d1d1d": "#f2f2f2" }}
                        >
                            <ColorSlider
                                channel='hue'
                                value={hueColor}
                                onChange={(e) => {
                                  setHueColor(e);
                                  setDarkSlider(parseColor(
                                    `hsl(${e.hue}, ${e.saturation}%, ${darkSlider.lightness}%)`
                                  ))
                                  setDarkBoardColor(parseColor(
                                    `hsl(${e.hue}, ${e.saturation}%, ${darkBoardColor.lightness}%)`
                                  ))
                                  setLightSlider(parseColor(
                                    `hsl(${e.hue}, ${e.saturation}%, ${lightSlider.lightness}%)`
                                  ))
                                  setLightBoardColor(parseColor(
                                    `hsl(${e.hue}, ${e.saturation}%, ${lightBoardColor.lightness}%)`
                                  ))
                                  setSelectedTemplateColor(new Set());
                                }}
                                style={{ width: 192 }}
                            >
                                <Label className='text-gray-800 dark:text-white'/>
                                <SliderOutput className='text-gray-800 dark:text-white'/>
                                <SliderTrack >
                                    <ColorThumb />
                                </SliderTrack>
                            </ColorSlider>

                            <ColorSlider
                                channel='saturation'
                                value={hueColor}
                                onChange={(e) => {
                                  setHueColor(e);
                                  setDarkSlider(parseColor(
                                    `hsl(${e.hue}, ${e.saturation}%, ${darkSlider.lightness}%)`
                                  ))
                                  setDarkBoardColor(parseColor(
                                    `hsl(${e.hue}, ${e.saturation}%, ${darkBoardColor.lightness}%)`
                                  ))
                                  setLightSlider(parseColor(
                                    `hsl(${e.hue}, ${e.saturation}%, ${lightSlider.lightness}%)`
                                  ))
                                  setLightBoardColor(parseColor(
                                    `hsl(${e.hue}, ${e.saturation}%, ${lightBoardColor.lightness}%)`
                                  ))
                                  setSelectedTemplateColor(new Set());
                                }}
                                style={{ width: 192, marginTop: 8 }}
                            >
                                <Label className='text-gray-800 dark:text-white'/>
                                <SliderOutput className='text-gray-800 dark:text-white'/>
                                <SliderTrack >
                                    <ColorThumb />
                                </SliderTrack>
                            </ColorSlider>

                            <ColorSlider
                                channel='lightness'
                                value={darkSlider}
                                onChange={(e) => {
                                  setDarkSlider(e);
                                  setDarkBoardColor(parseColor(
                                    `hsl(${darkBoardColor.hue}, ${darkBoardColor.saturation}%, ${(50 - (.5 * e.lightness))}%)`
                                  ))
                                  setSelectedTemplateColor(new Set());
                                }}
                                style={{ width: 192, marginTop: 8, }}
                            >
                                <Label className='text-gray-800 dark:text-white'>Dark side</Label>
                                <SliderOutput className='text-gray-800 dark:text-white'/>
                                <SliderTrack style={{background: `linear-gradient(to right, hsl(${hueColor.hue}, ${hueColor.saturation}%, ${hueColor.lightness}%), rgb(0, 0, 0))`}}>
                                    <ColorThumb 
                                      style={{ background: `hsl(${darkSlider.hue}, ${darkSlider.saturation}%, ${50 - (.5 * darkSlider.lightness)}%)`}}
                                    />
                                </SliderTrack>
                            </ColorSlider>

                            <ColorSlider
                                channel='lightness'
                                value={lightSlider}
                                onChange={(e) => {
                                  setLightSlider(e);
                                  setLightBoardColor(parseColor(
                                    `hsl(${lightBoardColor.hue}, ${lightBoardColor.saturation}%, ${(.5 * e.lightness) + 50}%)`
                                  ));
                                  setSelectedTemplateColor(new Set());
                                }}
                                style={{ width: 192, marginTop: 8, }}
                            >
                                <Label className='text-gray-800 dark:text-white'>Light side</Label>
                                <SliderOutput className='text-gray-800 dark:text-white'/>
                                <SliderTrack style={{background: `linear-gradient(to right, hsl(${hueColor.hue}, ${hueColor.saturation}%, ${hueColor.lightness}%), rgb(255, 255, 255))`}}>
                                    <ColorThumb 
                                      style={{ background: `hsl(${lightSlider.hue}, ${lightSlider.saturation}%, ${(.5 * lightSlider.lightness) + 50}%)`}}
                                    />
                                </SliderTrack>
                            </ColorSlider>

                            <div style={{ gap: 4, marginTop: 8, display: 'grid' }}>
                              <Label className='text-gray-800 dark:text-white'>Templates</Label>
                              <ListBox
                                style={{ width: 192 }}
                                className='react-aria-ColorSwatchPicker'
                                selectionMode='single'
                                orientation='horizontal'
                                aria-label='Board Color Templates'
                                selectedKeys={selectedTemplateColor}
                                onSelectionChange={(keys) => {
                                  // Occurs when an element already selected is clicked on again
                                  if (Array.from(keys).length == 0) { 
                                    return;
                                  }
                                  const selectedColorScheme = Array.from(keys)[0];
                                  const templateLightColor = parseColor(colorMap[selectedColorScheme][0])
                                  const templateDarkColor = parseColor(colorMap[selectedColorScheme][1])
                                  // const newHue = Math.floor((templateLightColor.hue + templateDarkColor.hue) / 2);
                                  // const newSaturation = Math.floor((templateLightColor.saturation + templateDarkColor.saturation) / 2);
                                  const newHue = templateDarkColor.hue;
                                  const newSaturation = templateDarkColor.saturation;
                                  setHueColor(parseColor(
                                    `hsl(${newHue}, ${newSaturation}%, 50%)`
                                  ))
                                  setDarkSlider(parseColor(
                                    `hsl(${newHue}, ${newSaturation}%, ${templateDarkColor.lightness}%)`
                                  ))
                                  setDarkBoardColor(parseColor(
                                    `hsl(${newHue}, ${newSaturation}%, ${templateDarkColor.lightness}%)`
                                  ))
                                  setLightSlider(parseColor(
                                    `hsl(${newHue}, ${newSaturation}%, ${templateLightColor.lightness}%)`
                                  ))
                                  setLightBoardColor(parseColor(
                                    `hsl(${newHue}, ${newSaturation}%, ${templateLightColor.lightness}%)`
                                  ))
                                  setSelectedTemplateColor(keys);
                                }}
                              >
                                {Object.keys(colorMap).map((colorScheme) => (
                                  <TemplateColor
                                    id={colorScheme}
                                    key={colorScheme}
                                    lightColor={colorMap[colorScheme][0]}
                                    darkColor={colorMap[colorScheme][1]}
                                  />
                                ))}
                              </ListBox>
                            </div>

                            <button 
                                  className="py-2 px-4 bg-blue-500 text-white hover:border-2 hover:border-white rounded"
                                  style={{ marginTop: 8 }}
                                  onClick={() => {
                                      onChangeColor({
                                          light: `hsl(${lightBoardColor.hue}, ${lightBoardColor.saturation}%, ${lightBoardColor.lightness}%)`,
                                          dark: `hsl(${darkBoardColor.hue}, ${darkBoardColor.saturation}%, ${darkBoardColor.lightness}%)`,
                                      })
                                      setPopoverOpen(false);
                                  }}
                              >
                                Apply
                              </button>
                            
                        </Dialog>
                    </Popover>
                </DialogTrigger>
            </ColorPicker>
        </div>
    )
}

export default BoardColor;