import os
from time import sleep
# import xml.etree.ElementTree as ET
import lxml.etree as ET
import sys
import os.path  
import shutil
import time

input_dir = "E:/Downloads/Suspended/Xml-Change/data" + "/"
output_dir = "E:/Downloads/Suspended/Xml-Change/output" + "/"


def remove_element(root_ele, tag):
    t = root_ele.find(tag)
    if t is not None:
        root_ele.remove(t)


def remove_element_list(root_ele, tag):
    t = root_ele.findall(tag)
    if len(t) > 0:
        for r in t:
            root_ele.remove(r)

def remove_element_fix(root_ele):
    for r in root_ele.findall('d'):
        tms = r.get('p').split(',')
        tm = tms[0] + ',' + tms[1] + ',' + tms[2] + ',' + tms[3] + ',0,0,0,0'
        r.set('user','u')
        r.set('p',tm)

def d_10_if(root_ele):
    t = root_ele.findall('d')
    if len(t) < 10:
        return False
    return True

#删除错误行
def del_wr(filename, del_line):
    with open(filename, 'r', encoding="utf8") as old_file:
        with open(filename, 'r+', encoding="utf8") as new_file:

            current_line = 0

            # 定位到需要删除的行
            while current_line < (del_line - 1):
                old_file.readline()
                current_line += 1

            # 当前光标在被删除行的行首，记录该位置
            seek_point = old_file.tell()

            # 设置光标位置
            new_file.seek(seek_point, 0)

            # 读需要删除的行，光标移到下一行行首
            old_file.readline()
            
            # 被删除行的下一行读给 next_line
            next_line = old_file.readline()

            # 连续覆盖剩余行，后面所有行上移一行
            while next_line:
                new_file.write(next_line)
                next_line = old_file.readline()

            # 写完最后一行后截断文件，因为删除操作，文件整体少了一行，原文件最后一行需要去掉
            new_file.truncate()



while True:
    files = os.listdir(input_dir)
    for file in files:
        print("文件读取：" + input_dir + file)
        parser = ET.XMLParser(recover=True)
        tree = ET.parse(input_dir + file, parser=parser)
        # while True:
        #     try:
        #         tree = ET.parse(file_dir + file)
        #         break
        #     except Exception as e:
        #         del_wr(file_dir + file, e.__traceback__.tb_lineno)
        #         print("处理错误行：" + str(e.__traceback__.tb_lineno))
        
        root = tree.getroot()
        remove_element(root, 'BililiveRecorder')
        remove_element(root, 'BililiveRecorderRecordInfo')
        remove_element(root, 'BililiveRecorderXmlStyle')
        remove_element_list(root, 'gift')
        remove_element_list(root, 'sc')
        remove_element_list(root, 'guard')
        remove_element_fix(root)
        
        if d_10_if(root): tree.write(output_dir + file, encoding="UTF-8", xml_declaration=True)
        else: print("弹幕数小于十条，不输出文件！：" + file)
        
        print("处理完成，删除：" + file)
        os.remove(input_dir + file)
        print(" ")
    print("等待1600秒......")
    time.sleep(1600)